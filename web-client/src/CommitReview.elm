module CommitReview exposing (AlteredLine, ApprovedState(..), CommitReview, EditType(..), FileReview, FileReviewType(..), OwnerTagStatus, Review, ReviewType(..), Status(..), Tag, countTotalReviewsAndTags, decodeCommitReview, filterFileReviews, getOwnerTagStatuses, readableTagType, updateReviews, updateTags)

import Dict
import Json.Decode as Decode
import Set


type alias CommitReview =
    { repoId : Int
    , repoFullName : String
    , branchName : String
    , pullRequestNumber : Int
    , commitId : String
    , fileReviews : List FileReview
    , remainingOwnersToApproveDocs : Set.Set String
    , headCommitId : String
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
    , alteredLines : List AlteredLine
    }


{-| The 3 types of reviews.

The `Bool` on new and modified tags allows you to show/hide the diff. It wouldn't make sense to hide the diff on a
deleted tag (because then what are you showing?) so we don't have a bool on it to allow that.

-}
type ReviewType
    = ReviewDeletedTag
    | ReviewNewTag Bool
    | ReviewModifiedTag Bool


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
    = Neutral
    | Approved
    | Rejected
    | RequestingApproval
    | RequestingRemoveApproval
    | RequestingRejection
    | RequestingRemoveRejection
    | RequestFailed err


type TagType
    = FileTag
    | BlockTag
    | LineTag
    | FunctionTag


type alias OwnerTagStatus =
    { username : String
    , approvedTags : Int
    , rejectedTags : Int
    , neutralTags : Int
    , totalTags : Int
    , approvedDocs : Bool
    }


type Status
    = Confirmed
    | Unconfirmed Int


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


countTotalReviewsAndTags : List FileReview -> Int
countTotalReviewsAndTags =
    List.foldl (\fileReview totalCount -> totalCount + reviewOrTagCount fileReview) 0


reviewOrTagCount : FileReview -> Int
reviewOrTagCount { fileReviewType } =
    case fileReviewType of
        NewFileReview tags ->
            List.length tags

        DeletedFileReview tags ->
            List.length tags

        RenamedFileReview _ reviews ->
            List.length reviews

        ModifiedFileReview reviews ->
            List.length reviews


fileReviewFilterTagsForUser : String -> FileReview -> FileReview
fileReviewFilterTagsForUser username =
    filterFileReviewTagsAndReviews
        (\tag -> tag.owner == username)
        (\review -> review.tag.owner == username)


fileReviewFilterTagsThatNeedApproval : FileReview -> FileReview
fileReviewFilterTagsThatNeedApproval =
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


{-| Update all tags in a commit review.
-}
updateTags : (Tag -> Tag) -> CommitReview -> CommitReview
updateTags updateTag commitReview =
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
    { commitReview | fileReviews = List.map fileReviewTagMap commitReview.fileReviews }


updateReviews : (Review -> Review) -> CommitReview -> CommitReview
updateReviews updateReview commitReview =
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
    { commitReview | fileReviews = List.map fileReviewTagMap commitReview.fileReviews }


getOwnerTagStatuses : CommitReview -> List OwnerTagStatus
getOwnerTagStatuses commitReview =
    tagFold
        (\tag tagCountDict ->
            Dict.update
                tag.owner
                (\maybeTagAcc ->
                    Maybe.withDefault { approved = 0, rejected = 0, neutral = 0, total = 0 } maybeTagAcc
                        |> (\acc ->
                                case tag.approvedState of
                                    Approved ->
                                        { acc | approved = acc.approved + 1, total = acc.total + 1 }

                                    Rejected ->
                                        { acc | rejected = acc.rejected + 1, total = acc.total + 1 }

                                    Neutral ->
                                        { acc | neutral = acc.neutral + 1, total = acc.total + 1 }

                                    _ ->
                                        { acc | total = acc.total + 1 }
                           )
                        |> Just
                )
                tagCountDict
        )
        Dict.empty
        commitReview
        |> Dict.toList
        |> List.map
            (\( owner, { approved, rejected, neutral, total } ) ->
                { username = owner
                , totalTags = total
                , approvedTags = approved
                , rejectedTags = rejected
                , neutralTags = neutral
                , approvedDocs = not <| Set.member owner commitReview.remainingOwnersToApproveDocs
                }
            )


type ReviewOrTag
    = AReview Review
    | ATag Tag


isApproved : ApprovedState err -> Bool
isApproved approvedState =
    case approvedState of
        Approved ->
            True

        _ ->
            False


{-| A basic fold on the reviews/tags.
-}
reviewOrTagFold : (ReviewOrTag -> acc -> acc) -> acc -> CommitReview -> acc
reviewOrTagFold foldFunc initAcc commitReview =
    let
        allTagsOrReviews : List ReviewOrTag
        allTagsOrReviews =
            List.foldl
                (\fileReview reviewsOrTags ->
                    List.append reviewsOrTags <|
                        case fileReview.fileReviewType of
                            NewFileReview tags ->
                                List.map ATag tags

                            DeletedFileReview tags ->
                                List.map ATag tags

                            ModifiedFileReview reviews ->
                                List.map AReview reviews

                            RenamedFileReview _ reviews ->
                                List.map AReview reviews
                )
                []
                commitReview.fileReviews
    in
    List.foldl foldFunc initAcc allTagsOrReviews


{-| A basic fold on the tags.
-}
tagFold : (Tag -> acc -> acc) -> acc -> CommitReview -> acc
tagFold foldFunc =
    reviewOrTagFold
        (\tagOrReview ->
            foldFunc <|
                case tagOrReview of
                    ATag aTag ->
                        aTag

                    AReview aReview ->
                        aReview.tag
        )


type alias ApprovedAndRejectedTags =
    { approvedTags : Set.Set String
    , rejectedTags : Set.Set String
    }


decodeCommitReview : Decode.Decoder CommitReview
decodeCommitReview =
    let
        decodeApprovedAndRejectedTags =
            Decode.map2 ApprovedAndRejectedTags
                (Decode.field "approvedTags" (Decode.list Decode.string |> Decode.map Set.fromList))
                (Decode.field "rejectedTags" (Decode.list Decode.string |> Decode.map Set.fromList))
    in
    decodeApprovedAndRejectedTags
        |> Decode.andThen
            (\tagStates ->
                Decode.map8 CommitReview
                    (Decode.field "repoId" Decode.int)
                    (Decode.field "repoFullName" Decode.string)
                    (Decode.field "branchName" Decode.string)
                    (Decode.field "pullRequestNumber" Decode.int)
                    (Decode.field "commitId" Decode.string)
                    (Decode.field "fileReviews" (Decode.list <| decodeFileReview tagStates))
                    (Decode.field "remainingOwnersToApproveDocs" (Decode.list Decode.string |> Decode.map Set.fromList))
                    (Decode.field "headCommitId" Decode.string)
            )


decodeFileReview : ApprovedAndRejectedTags -> Decode.Decoder FileReview
decodeFileReview tagStates =
    Decode.map2 FileReview
        (decodeFileReviewType tagStates)
        (Decode.field "currentFilePath" Decode.string)


decodeFileReviewType : ApprovedAndRejectedTags -> Decode.Decoder FileReviewType
decodeFileReviewType tagStates =
    Decode.field "fileReviewType" Decode.string
        |> Decode.andThen
            (\reviewType ->
                case reviewType of
                    "modified-file" ->
                        decodeModifiedfileReview tagStates

                    "renamed-file" ->
                        decodeRenamedFileReview tagStates

                    "new-file" ->
                        decodeNewFileReview tagStates

                    "deleted-file" ->
                        decodeDeletedFileReview tagStates

                    fileReviewType ->
                        Decode.fail <| "You have an invalid file review type: " ++ fileReviewType
            )


decodeModifiedfileReview : ApprovedAndRejectedTags -> Decode.Decoder FileReviewType
decodeModifiedfileReview tagStates =
    Decode.map ModifiedFileReview
        (Decode.field "reviews" (Decode.list <| decodeReview tagStates))


decodeRenamedFileReview : ApprovedAndRejectedTags -> Decode.Decoder FileReviewType
decodeRenamedFileReview tagStates =
    Decode.map2 RenamedFileReview
        (Decode.field "previousFilePath" Decode.string)
        (Decode.field "reviews" (Decode.list <| decodeReview tagStates))


decodeNewFileReview : ApprovedAndRejectedTags -> Decode.Decoder FileReviewType
decodeNewFileReview tagStates =
    Decode.map NewFileReview
        (Decode.field "tags" (Decode.list <| decodeTag tagStates))


decodeDeletedFileReview : ApprovedAndRejectedTags -> Decode.Decoder FileReviewType
decodeDeletedFileReview tagStates =
    Decode.map DeletedFileReview
        (Decode.field "tags" (Decode.list <| decodeTag tagStates))


decodeReview : ApprovedAndRejectedTags -> Decode.Decoder Review
decodeReview tagStates =
    Decode.map3 Review
        (Decode.field "reviewType" Decode.string
            |> Decode.andThen
                (\reviewType ->
                    case reviewType of
                        "new" ->
                            Decode.succeed <| ReviewNewTag True

                        "deleted" ->
                            Decode.succeed ReviewDeletedTag

                        "modified" ->
                            Decode.succeed <| ReviewModifiedTag True

                        _ ->
                            Decode.fail <| "Invalid review type: " ++ reviewType
                )
        )
        (Decode.field "tag" <| decodeTag tagStates)
        (Decode.field "alteredLines" <| Decode.list decodeAlteredLine)


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


decodeTag : ApprovedAndRejectedTags -> Decode.Decoder Tag
decodeTag { approvedTags, rejectedTags } =
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

                        else if Set.member tagId rejectedTags then
                            Rejected

                        else
                            Neutral
                    )
            )
