module BranchReview exposing (BranchReview, FileReview, decodeBranchReview)

import Json.Decode as Decode


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


decodeBranchReview : Decode.Decoder BranchReview
decodeBranchReview =
    Decode.map5 BranchReview
        (Decode.field "repoId" Decode.string)
        (Decode.field "repoFullName" Decode.string)
        (Decode.field "branchName" Decode.string)
        (Decode.field "commitId" Decode.string)
        (Decode.field "fileReviews" (Decode.list decodeFileReview))


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
