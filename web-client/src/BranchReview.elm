module BranchReview exposing (AlteredLine, ApprovedState(..), BranchReview, EditType(..), FileReview, FileReviewType(..), Review, ReviewType(..), Tag, decodeBranchReview, filterFileReviews, readableTagType, updateReviews, updateTags)

import Json.Decode as Decode
import Set


type alias BranchReview =
    { repoId : String
    , repoFullName : String
    , branchName : String
    , commitId : String
    , fileReviews : List FileReview
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


{-| A review is just a tag with extra metadata such as the alteredLines.
-}
type alias Review =
    { reviewType : ReviewType
    , tag : Tag
    }


type ReviewType
    = ReviewNewTag
    | ReviewDeletedTag
      -- Bool = Show Altered Lines
    | ReviewModifiedTag Bool (List AlteredLine)


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

    -- TODO actual error type
    , approvedState : ApprovedState ()
    }


type ApprovedState err
    = Approved
    | NotApproved
    | RequestingApproval
    | RequestFailed err


type TagType
    = FileTag
    | BlockTag
    | LineTag
    | FunctionTag


filterFileReviews :
    { filterForUser : Maybe String
    , filterApprovedTags : Bool
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
                if filterApprovedTags then
                    List.map fileReviewFilterTagsThatNeedApproval fileReviewsIn

                else
                    fileReviewsIn
           )
        |> List.filter fileReviewHasTagsOrReviews


fileReviewFilterTagsForUser : String -> FileReview -> FileReview
fileReviewFilterTagsForUser username =
    filterFileReviewTagsAndReviews
        (\tag -> tag.owner == username)
        (\review -> review.tag.owner == username)


fileReviewFilterTagsThatNeedApproval : FileReview -> FileReview
fileReviewFilterTagsThatNeedApproval =
    let
        isApproved approvedState =
            case approvedState of
                Approved ->
                    True

                _ ->
                    False
    in
    filterFileReviewTagsAndReviews
        (\{ approvedState } -> not <| isApproved approvedState)
        (\{ tag } -> not <| isApproved tag.approvedState)


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
            "File Tag"

        LineTag ->
            "Line Tag"

        BlockTag ->
            "Block Tag"

        FunctionTag ->
            "Function Tag"


{-| Update all tags in a branch review.
-}
updateTags : (Tag -> Tag) -> BranchReview -> BranchReview
updateTags updateTag branchReview =
    let
        updateReview : Review -> Review
        updateReview review =
            { review | tag = updateTag review.tag }

        fileReviewTagMap : FileReview -> FileReview
        fileReviewTagMap fileReview =
            { fileReview
                | fileReviewType =
                    case fileReview.fileReviewType of
                        NewFileReview tags ->
                            NewFileReview <| List.map updateTag tags

                        DeletedFileReview tags ->
                            DeletedFileReview <| List.map updateTag tags

                        ModifiedFileReview reviews ->
                            ModifiedFileReview <| List.map updateReview reviews

                        RenamedFileReview previousFilePath reviews ->
                            RenamedFileReview previousFilePath <| List.map updateReview reviews
            }
    in
    { branchReview | fileReviews = List.map fileReviewTagMap branchReview.fileReviews }


updateReviews : (Review -> Review) -> BranchReview -> BranchReview
updateReviews updateReview branchReview =
    let
        fileReviewTagMap : FileReview -> FileReview
        fileReviewTagMap fileReview =
            { fileReview
                | fileReviewType =
                    case fileReview.fileReviewType of
                        ModifiedFileReview reviews ->
                            ModifiedFileReview <| List.map updateReview reviews

                        RenamedFileReview previousFilePath reviews ->
                            RenamedFileReview previousFilePath <| List.map updateReview reviews

                        other ->
                            other
            }
    in
    { branchReview | fileReviews = List.map fileReviewTagMap branchReview.fileReviews }



-- Encoders and decoders


decodeBranchReview : Decode.Decoder BranchReview
decodeBranchReview =
    Decode.field "approvedTags" (Decode.list Decode.string |> Decode.map Set.fromList)
        |> Decode.andThen
            (\approvedTags ->
                Decode.map5 BranchReview
                    (Decode.field "repoId" Decode.string)
                    (Decode.field "repoFullName" Decode.string)
                    (Decode.field "branchName" Decode.string)
                    (Decode.field "commitId" Decode.string)
                    (Decode.field "fileReviews" (Decode.list (decodeFileReview approvedTags)))
            )


decodeFileReview : Set.Set String -> Decode.Decoder FileReview
decodeFileReview approvedTags =
    Decode.map2 FileReview
        (decodeFileReviewType approvedTags)
        (Decode.field "currentFilePath" Decode.string)


decodeFileReviewType : Set.Set String -> Decode.Decoder FileReviewType
decodeFileReviewType approvedTags =
    Decode.field "fileReviewType" Decode.string
        |> Decode.andThen
            (\reviewType ->
                case reviewType of
                    "modified-file" ->
                        decodeModifiedfileReview approvedTags

                    "renamed-file" ->
                        decodeRenamedFileReview approvedTags

                    "new-file" ->
                        decodeNewFileReview approvedTags

                    "deleted-file" ->
                        decodeDeletedFileReview approvedTags

                    fileReviewType ->
                        Decode.fail <| "You have an invalid file review type: " ++ fileReviewType
            )


decodeModifiedfileReview : Set.Set String -> Decode.Decoder FileReviewType
decodeModifiedfileReview approvedTags =
    Decode.map ModifiedFileReview
        (Decode.field "reviews" (Decode.list <| decodeReview approvedTags))


decodeRenamedFileReview : Set.Set String -> Decode.Decoder FileReviewType
decodeRenamedFileReview approvedTags =
    Decode.map2 RenamedFileReview
        (Decode.field "previousFilePath" Decode.string)
        (Decode.field "reviews" (Decode.list <| decodeReview approvedTags))


decodeNewFileReview : Set.Set String -> Decode.Decoder FileReviewType
decodeNewFileReview approvedTags =
    Decode.map NewFileReview
        (Decode.field "tags" (Decode.list <| decodeTag approvedTags))


decodeDeletedFileReview : Set.Set String -> Decode.Decoder FileReviewType
decodeDeletedFileReview approvedTags =
    Decode.map DeletedFileReview
        (Decode.field "tags" (Decode.list <| decodeTag approvedTags))


decodeReview : Set.Set String -> Decode.Decoder Review
decodeReview approvedTags =
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
                                |> Decode.map (ReviewModifiedTag False)

                        _ ->
                            Decode.fail <| "Invalid review type: " ++ reviewType
                )
        )
        (Decode.field "tag" <| decodeTag approvedTags)


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


decodeTag : Set.Set String -> Decode.Decoder Tag
decodeTag approvedTags =
    Decode.field "tagId" Decode.string
        |> Decode.andThen
            (\tagId ->
                Decode.map8 Tag
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
                    (Decode.succeed <|
                        if Set.member tagId approvedTags then
                            Approved

                        else
                            NotApproved
                    )
            )
