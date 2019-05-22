module BranchReview exposing (AlteredLine, BranchReview, FileReview, FileReviewType(..), Review, ReviewType(..), Tag, decodeBranchReview, filterFileReviews, readableTagType)

import Json.Decode as Decode


type alias BranchReview =
    { repoId : String
    , repoFullName : String
    , branchName : String
    , commitId : String
    , fileReviews : List FileReview
    , approvedTags : List String
    }


type alias FileReview =
    { fileReviewType : FileReviewType
    , currentFilePath : String
    }


type FileReviewType
    = ModifiedFileReview (List Review)
    | RenamedFileReview String (List Review)
    | DeletedFileReview (List Tag)
    | NewFileReview (List Tag)


type alias Review =
    { reviewType : ReviewType
    , tag : Tag
    }


type ReviewType
    = ReviewNewTag
    | ReviewDeletedTag
    | ReviewModifiedTag (List AlteredLine)


type alias AlteredLine =
    { editType : EditType
    , currentLineNumber : Int
    , previousLineNumber : Int
    , content : String
    }


type EditType
    = Insertion
    | Deletion


type alias Tag =
    { tagType : TagType
    , owner : String
    , startLine : Int
    , endLine : Int
    , tagAnnotationLine : Int
    , content : List String
    , tagId : String
    }


type TagType
    = FileTag
    | BlockTag
    | LineTag
    | FunctionTag


filterFileReviews :
    { filterForUser : Maybe String
    , filterApprovedTags : Maybe (List String)
    }
    -> List FileReview
    -> List FileReview
filterFileReviews { filterForUser, filterApprovedTags } fileReviews =
    fileReviews
        |> (\fileReviewsIn ->
                case filterForUser of
                    Nothing ->
                        fileReviewsIn

                    Just username ->
                        List.map (fileReviewFilterTagsForUser username) fileReviewsIn
           )
        |> (\fileReviewsIn ->
                case filterApprovedTags of
                    Nothing ->
                        fileReviewsIn

                    Just approvedTags ->
                        List.map (fileReviewFilterTagsThatNeedApproval approvedTags) fileReviewsIn
           )
        |> List.filter fileReviewHasTagsOrReviews


fileReviewFilterTagsForUser : String -> FileReview -> FileReview
fileReviewFilterTagsForUser username =
    filterFileReviewTagsAndReviews
        (\tag -> tag.owner == username)
        (\review -> review.tag.owner == username)


fileReviewFilterTagsThatNeedApproval : List String -> FileReview -> FileReview
fileReviewFilterTagsThatNeedApproval approvedTagIds =
    filterFileReviewTagsAndReviews
        (\{ tagId } -> not <| List.member tagId approvedTagIds)
        (\{ tag } -> not <| List.member tag.tagId approvedTagIds)


fileReviewHasTagsOrReviews : FileReview -> Bool
fileReviewHasTagsOrReviews fileReview =
    case fileReview.fileReviewType of
        NewFileReview tags ->
            List.length tags > 0

        DeletedFileReview tags ->
            List.length tags > 0

        ModifiedFileReview reviews ->
            List.length reviews > 0

        RenamedFileReview _ reviews ->
            List.length reviews > 0


filterFileReviewTagsAndReviews : (Tag -> Bool) -> (Review -> Bool) -> FileReview -> FileReview
filterFileReviewTagsAndReviews keepTag keepReview fileReview =
    { fileReview
        | fileReviewType =
            case fileReview.fileReviewType of
                NewFileReview tags ->
                    NewFileReview <| List.filter keepTag tags

                DeletedFileReview tags ->
                    DeletedFileReview <| List.filter keepTag tags

                ModifiedFileReview reviews ->
                    ModifiedFileReview <| List.filter keepReview reviews

                RenamedFileReview previousFilePath reviews ->
                    RenamedFileReview previousFilePath <| List.filter keepReview reviews
    }


readableTagType : TagType -> String
readableTagType tagType =
    case tagType of
        FileTag ->
            "file"

        LineTag ->
            "line"

        BlockTag ->
            "block"

        FunctionTag ->
            "function"



-- Encoders and decoders


decodeBranchReview : Decode.Decoder BranchReview
decodeBranchReview =
    Decode.map6 BranchReview
        (Decode.field "repoId" Decode.string)
        (Decode.field "repoFullName" Decode.string)
        (Decode.field "branchName" Decode.string)
        (Decode.field "commitId" Decode.string)
        (Decode.field "fileReviews" (Decode.list decodeFileReview))
        (Decode.field "approvedTags" (Decode.list Decode.string))


decodeFileReview : Decode.Decoder FileReview
decodeFileReview =
    Decode.map2 FileReview
        decodeFileReviewType
        (Decode.field "currentFilePath" Decode.string)


decodeFileReviewType : Decode.Decoder FileReviewType
decodeFileReviewType =
    Decode.field "fileReviewType" Decode.string
        |> Decode.andThen
            (\reviewType ->
                case reviewType of
                    "modified-file" ->
                        decodeModifiedfileReview

                    "renamed-file" ->
                        decodeRenamedFileReview

                    "new-file" ->
                        decodeNewFileReview

                    "deleted-file" ->
                        decodeDeletedFileReview

                    fileReviewType ->
                        Decode.fail <| "You have an invalid file review type: " ++ fileReviewType
            )


decodeModifiedfileReview : Decode.Decoder FileReviewType
decodeModifiedfileReview =
    Decode.map ModifiedFileReview
        (Decode.field "reviews" (Decode.list decodeReview))


decodeRenamedFileReview : Decode.Decoder FileReviewType
decodeRenamedFileReview =
    Decode.map2 RenamedFileReview
        (Decode.field "previousFilePath" Decode.string)
        (Decode.field "reviews" (Decode.list decodeReview))


decodeNewFileReview : Decode.Decoder FileReviewType
decodeNewFileReview =
    Decode.map NewFileReview
        (Decode.field "tags" (Decode.list decodeTag))


decodeDeletedFileReview : Decode.Decoder FileReviewType
decodeDeletedFileReview =
    Decode.map DeletedFileReview
        (Decode.field "tags" (Decode.list decodeTag))


decodeReview : Decode.Decoder Review
decodeReview =
    Decode.map2 Review
        (Decode.field "reviewType" Decode.string
            |> Decode.andThen
                (\reviewType ->
                    case reviewType of
                        "new" ->
                            Decode.succeed ReviewNewTag

                        "deleted" ->
                            Decode.succeed ReviewDeletedTag

                        "modified" ->
                            Decode.field "alteredLines" (Decode.list decodeAlteredLine)
                                |> Decode.map ReviewModifiedTag

                        _ ->
                            Decode.fail <| "Invalid review type: " ++ reviewType
                )
        )
        (Decode.field "tag" decodeTag)


decodeAlteredLine : Decode.Decoder AlteredLine
decodeAlteredLine =
    Decode.map4 AlteredLine
        (Decode.field "type" Decode.string
            |> Decode.andThen
                (\alteredLineType ->
                    case alteredLineType of
                        "added" ->
                            Decode.succeed Insertion

                        "deleted" ->
                            Decode.succeed Deletion

                        _ ->
                            Decode.fail <| "Not a valid altered line edit type: " ++ alteredLineType
                )
        )
        (Decode.field "currentLineNumber" Decode.int)
        (Decode.field "previousLineNumber" Decode.int)
        (Decode.field "content" Decode.string)


decodeTag : Decode.Decoder Tag
decodeTag =
    Decode.map7 Tag
        (Decode.field "tagType" Decode.string
            |> Decode.andThen
                (\tagType ->
                    case tagType of
                        "file" ->
                            Decode.succeed FileTag

                        "block" ->
                            Decode.succeed BlockTag

                        "function" ->
                            Decode.succeed FunctionTag

                        "line" ->
                            Decode.succeed LineTag

                        _ ->
                            Decode.fail <| "Invalid tag type " ++ tagType
                )
        )
        (Decode.field "owner" Decode.string)
        (Decode.field "startLine" Decode.int)
        (Decode.field "endLine" Decode.int)
        (Decode.field "tagAnnotationLine" Decode.int)
        (Decode.field "content" (Decode.list Decode.string))
        (Decode.field "tagId" Decode.string)
