module CommitReview exposing (AlteredLine, ApprovedState(..), CommitReview, EditType(..), FileReview, FileReviewType(..), OwnerTagStatus, Review, ReviewOrTag(..), ReviewType(..), Status(..), Tag, countTotalReviewsAndTags, countVisibleReviewsAndTags, decodeCommitReview, extractRenderEditorConfigs, getOwnerTagStatuses, readableTagType, renderConfigForReviewOrTag, updateCommitReviewForSearch, updateReviews, updateTags)

import Dict
import Json.Decode as Decode
import Json.Decode.Pipeline exposing (hardcoded, optional, required)
import Language
import Ports
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
    , currentLanguage : Language.Language
    , isHidden : Bool
    }


type FileReviewType
    = ModifiedFileReview (List Review)
    | RenamedFileReview String Language.Language (List Review)
    | DeletedFileReview (List Tag)
    | NewFileReview (List Tag)


{-| A review is just a tag with extra metadata such as the alteredLines.
-}
type alias Review =
    { reviewType : ReviewType
    , tag : Tag
    , alteredLines : List AlteredLine
    , contentWithDiffs : List String
    , lineNumbersWithDiffs : List (Maybe Int)
    , redLineRanges : List ( Int, Int )
    , greenLineRanges : List ( Int, Int )
    }


{-| The 3 types of reviews.

The `Bool` on new and modified tags allows you to show/hide the diff. It wouldn't make sense to hide the diff on a
deleted tag (because then what are you showing?) so we don't have a bool on it to allow that.

-}
type ReviewType
    = ReviewDeletedTag Int
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
    , isHidden : Bool
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


type alias SearchBy =
    { filterForUser : Maybe String
    , filterApprovedTags : Bool
    }


updateCommitReviewForSearch :
    SearchBy
    -> CommitReview
    -> CommitReview
updateCommitReviewForSearch searchBy commitReview =
    { commitReview | fileReviews = List.map (updateFileReviewForSearch searchBy) commitReview.fileReviews }


getNewHiddenValue : SearchBy -> Tag -> Bool
getNewHiddenValue searchBy tag =
    let
        isHiddenThroughUserFilter =
            case searchBy.filterForUser of
                Nothing ->
                    False

                Just username ->
                    tag.owner /= username

        isHiddenThroughApprovalFilter =
            if searchBy.filterApprovedTags then
                isApproved tag.approvedState

            else
                False
    in
    isHiddenThroughApprovalFilter || isHiddenThroughUserFilter


updateFileReviewForSearch : SearchBy -> FileReview -> FileReview
updateFileReviewForSearch searchBy fileReview =
    let
        filterTagsForSearch =
            List.map
                (\tag -> { tag | isHidden = getNewHiddenValue searchBy tag })

        filterReviewsForSearch =
            List.map
                (\review ->
                    let
                        reviewTag =
                            review.tag
                    in
                    { review | tag = { reviewTag | isHidden = getNewHiddenValue searchBy reviewTag } }
                )
    in
    case fileReview.fileReviewType of
        NewFileReview tags ->
            let
                updatedTags =
                    filterTagsForSearch tags

                visibleTags =
                    countVisibleTags updatedTags
            in
            { fileReview
                | fileReviewType = NewFileReview updatedTags
                , isHidden = visibleTags == 0
            }

        DeletedFileReview tags ->
            let
                updatedTags =
                    filterTagsForSearch tags

                visibleTags =
                    countVisibleTags updatedTags
            in
            { fileReview
                | fileReviewType = DeletedFileReview updatedTags
                , isHidden = visibleTags == 0
            }

        ModifiedFileReview reviews ->
            let
                updatedReviews =
                    filterReviewsForSearch reviews

                visibleReviews =
                    countVisibleReviews updatedReviews
            in
            { fileReview
                | fileReviewType = ModifiedFileReview updatedReviews
                , isHidden = visibleReviews == 0
            }

        RenamedFileReview prevName prevLang reviews ->
            let
                updatedReviews =
                    filterReviewsForSearch reviews

                visibleReviews =
                    countVisibleReviews updatedReviews
            in
            { fileReview
                | fileReviewType = RenamedFileReview prevName prevLang updatedReviews
                , isHidden = visibleReviews == 0
            }


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

        RenamedFileReview _ _ reviews ->
            List.length reviews

        ModifiedFileReview reviews ->
            List.length reviews


countVisibleReviewsAndTags : List FileReview -> Int
countVisibleReviewsAndTags =
    List.foldl (\fileReview totalCount -> totalCount + visibleReviewOrTagCount fileReview) 0


visibleReviewOrTagCount : FileReview -> Int
visibleReviewOrTagCount { fileReviewType } =
    case fileReviewType of
        NewFileReview tags ->
            countVisibleTags tags

        DeletedFileReview tags ->
            countVisibleTags tags

        RenamedFileReview _ _ reviews ->
            countVisibleReviews reviews

        ModifiedFileReview reviews ->
            countVisibleReviews reviews


countVisibleTags : List Tag -> Int
countVisibleTags =
    List.length
        << List.filter (.isHidden >> (==) False)


countVisibleReviews : List Review -> Int
countVisibleReviews =
    List.map .tag >> countVisibleTags


readableTagType : TagType -> String
readableTagType tagType =
    case tagType of
        FileTag ->
            "File Tag"

        LineTag ->
            "Line Tag"

        BlockTag ->
            "Block Tag"


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

                        RenamedFileReview previousFilePath previousLanguage reviews ->
                            RenamedFileReview previousFilePath previousLanguage <| List.map updateReview reviews
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

                        RenamedFileReview previousFilePath previousLanguage reviews ->
                            RenamedFileReview previousFilePath previousLanguage <| List.map updateReview reviews

                        other ->
                            other
            }
    in
    { commitReview | fileReviews = List.map fileReviewTagMap commitReview.fileReviews }


findReview : String -> CommitReview -> Maybe Review
findReview tagId =
    let
        go remainingTagOrReviews =
            case remainingTagOrReviews of
                [] ->
                    Nothing

                (AReview review) :: tailTagsAndReviews ->
                    if review.tag.tagId == tagId then
                        Just review

                    else
                        go tailTagsAndReviews

                _ :: tailTagsAndReviews ->
                    go tailTagsAndReviews
    in
    allTagsOrReviews >> go


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
    | DeletedFileTag Tag
    | NewFileTag Tag


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
reviewOrTagFold foldFunc initAcc =
    allTagsOrReviews >> List.foldl foldFunc initAcc


getTagsOrReviewsFromFileReview : FileReview -> List ReviewOrTag
getTagsOrReviewsFromFileReview fileReview =
    case fileReview.fileReviewType of
        NewFileReview tags ->
            List.map NewFileTag tags

        DeletedFileReview tags ->
            List.map DeletedFileTag tags

        ModifiedFileReview reviews ->
            List.map AReview reviews

        RenamedFileReview _ _ reviews ->
            List.map AReview reviews


{-| Get all tags and reviews from all file reviews
-}
allTagsOrReviews : CommitReview -> List ReviewOrTag
allTagsOrReviews =
    .fileReviews
        >> List.foldl
            (\fileReview reviewsOrTags ->
                List.append reviewsOrTags <|
                    getTagsOrReviewsFromFileReview fileReview
            )
            []


{-| A basic fold on the tags.
-}
tagFold : (Tag -> acc -> acc) -> acc -> CommitReview -> acc
tagFold foldFunc =
    reviewOrTagFold
        (\tagOrReview ->
            foldFunc <|
                case tagOrReview of
                    NewFileTag tag ->
                        tag

                    DeletedFileTag tag ->
                        tag

                    AReview aReview ->
                        aReview.tag
        )


extractRenderEditorConfigs : CommitReview -> List Ports.RenderCodeEditorConfig
extractRenderEditorConfigs =
    .fileReviews
        >> List.map
            (\fileReview ->
                getTagsOrReviewsFromFileReview fileReview
                    |> List.map (renderConfigForReviewOrTag fileReview.currentLanguage)
            )
        >> List.concat


renderConfigForReviewOrTag : Language.Language -> ReviewOrTag -> Ports.RenderCodeEditorConfig
renderConfigForReviewOrTag language reviewOrTag =
    case reviewOrTag of
        AReview review ->
            let
                { content, redLineRanges, greenLineRanges, customLineNumbers } =
                    case review.reviewType of
                        ReviewDeletedTag _ ->
                            { content = review.contentWithDiffs
                            , redLineRanges = review.redLineRanges
                            , greenLineRanges = review.greenLineRanges
                            , customLineNumbers = Just review.lineNumbersWithDiffs
                            }

                        ReviewNewTag showingDiff ->
                            if showingDiff then
                                { content = review.contentWithDiffs
                                , redLineRanges = review.redLineRanges
                                , greenLineRanges = review.greenLineRanges
                                , customLineNumbers = Just review.lineNumbersWithDiffs
                                }

                            else
                                { content = review.tag.content
                                , redLineRanges = []
                                , greenLineRanges = []
                                , customLineNumbers = Nothing
                                }

                        ReviewModifiedTag showingDiff ->
                            if showingDiff then
                                { content = review.contentWithDiffs
                                , redLineRanges = review.redLineRanges
                                , greenLineRanges = review.greenLineRanges
                                , customLineNumbers = Just review.lineNumbersWithDiffs
                                }

                            else
                                { content = review.tag.content
                                , redLineRanges = []
                                , greenLineRanges = []
                                , customLineNumbers = Nothing
                                }
            in
            { tagId = review.tag.tagId
            , startLineNumber = review.tag.startLine
            , content = content
            , redLineRanges = redLineRanges
            , greenLineRanges = greenLineRanges
            , customLineNumbers = customLineNumbers
            , language = Language.toString language
            }

        DeletedFileTag tag ->
            { tagId = tag.tagId
            , startLineNumber = tag.startLine
            , content = tag.content
            , redLineRanges = [ ( tag.startLine, tag.endLine ) ]
            , greenLineRanges = []
            , customLineNumbers = Nothing
            , language = Language.toString language
            }

        NewFileTag tag ->
            { tagId = tag.tagId
            , startLineNumber = tag.startLine
            , content = tag.content
            , redLineRanges = []
            , greenLineRanges = [ ( tag.startLine, tag.endLine ) ]
            , customLineNumbers = Nothing
            , language = Language.toString language
            }


type FileLineNumberType
    = CurrentFileLineNumbers
    | PreviousFileLineNumbers Int


calculateRangesAndContentWithDiff :
    Int
    -> List String
    -> List AlteredLine
    -> FileLineNumberType
    ->
        { greenLineRanges : List ( Int, Int )
        , redLineRanges : List ( Int, Int )
        , contentWithDiffs : List String
        , lineNumbersWithDiffs : List (Maybe Int)
        }
calculateRangesAndContentWithDiff startLineNumber content alteredLines fileLineNumberType =
    let
        addedLines : List AlteredLine
        addedLines =
            List.filter (.editType >> (==) Insertion) alteredLines

        deletedLines : List AlteredLine
        deletedLines =
            List.filter (.editType >> (==) Deletion) alteredLines

        nextLineNumberInCurrentFileIfSwallowedAlteredLine : EditType -> Int -> Int
        nextLineNumberInCurrentFileIfSwallowedAlteredLine editType lineNumber =
            case editType of
                Insertion ->
                    lineNumber + 1

                Deletion ->
                    lineNumber

        nextLineNumberIfSwallowedAlteredLine : EditType -> Int -> Int
        nextLineNumberIfSwallowedAlteredLine editType lineNumber =
            case ( editType, fileLineNumberType ) of
                ( Insertion, CurrentFileLineNumbers ) ->
                    lineNumber + 1

                ( Insertion, PreviousFileLineNumbers _ ) ->
                    lineNumber

                ( Deletion, CurrentFileLineNumbers ) ->
                    lineNumber

                ( Deletion, PreviousFileLineNumbers _ ) ->
                    lineNumber + 1

        nextContentIfSwallowedAlteredLines : EditType -> List String -> List String
        nextContentIfSwallowedAlteredLines editType remainingContent =
            case ( editType, fileLineNumberType ) of
                ( Insertion, CurrentFileLineNumbers ) ->
                    List.drop 1 remainingContent

                ( Insertion, PreviousFileLineNumbers _ ) ->
                    remainingContent

                ( Deletion, CurrentFileLineNumbers ) ->
                    remainingContent

                ( Deletion, PreviousFileLineNumbers _ ) ->
                    List.drop 1 remainingContent

        nextAlteredLineForLineNumber : Int -> List AlteredLine -> Maybe AlteredLine
        nextAlteredLineForLineNumber lineNumber remainingAlteredLines =
            case remainingAlteredLines of
                [] ->
                    Nothing

                headAlteredLine :: _ ->
                    case fileLineNumberType of
                        PreviousFileLineNumbers _ ->
                            if headAlteredLine.previousLineNumber == lineNumber then
                                Just headAlteredLine

                            else
                                Nothing

                        CurrentFileLineNumbers ->
                            if headAlteredLine.currentLineNumber == lineNumber then
                                Just headAlteredLine

                            else
                                Nothing

        go lineNumberInTag lineNumberInCurrentFile hightlightLineNumber remainingContent remainingAddedLines remainingDeletedLines acc =
            case ( remainingContent, remainingAddedLines, remainingDeletedLines ) of
                -- Base case.
                ( [], [], [] ) ->
                    acc

                -- Only added lines left, must be those.
                ( [], headAddedLines :: tailAddedLines, [] ) ->
                    go
                        (nextLineNumberIfSwallowedAlteredLine Insertion lineNumberInTag)
                        (nextLineNumberInCurrentFileIfSwallowedAlteredLine Insertion lineNumberInCurrentFile)
                        (hightlightLineNumber + 1)
                        []
                        tailAddedLines
                        []
                        { acc
                            | contentWithDiffs = acc.contentWithDiffs ++ [ headAddedLines.content ]
                            , greenLineRanges = acc.greenLineRanges ++ [ ( hightlightLineNumber, hightlightLineNumber ) ]
                            , lineNumbersWithDiffs = acc.lineNumbersWithDiffs ++ [ Just lineNumberInCurrentFile ]
                        }

                -- Deleted lines left with no content, must be deleted lines first then added lines if there are any.
                ( [], _, headDeletedLines :: tailDeletedLines ) ->
                    go
                        (nextLineNumberIfSwallowedAlteredLine Deletion lineNumberInTag)
                        (nextLineNumberInCurrentFileIfSwallowedAlteredLine Deletion lineNumberInCurrentFile)
                        (hightlightLineNumber + 1)
                        []
                        remainingAddedLines
                        tailDeletedLines
                        { acc
                            | contentWithDiffs = acc.contentWithDiffs ++ [ headDeletedLines.content ]
                            , redLineRanges = acc.redLineRanges ++ [ ( hightlightLineNumber, hightlightLineNumber ) ]
                            , lineNumbersWithDiffs = acc.lineNumbersWithDiffs ++ [ Nothing ]
                        }

                -- Content is left:
                --  1. check if a deleted line should be swallowed
                --  2. check if a added line should be swallowed
                --  3. else it must be the content next
                ( headContent :: tailContent, _, _ ) ->
                    case nextAlteredLineForLineNumber lineNumberInTag remainingDeletedLines of
                        Nothing ->
                            case nextAlteredLineForLineNumber lineNumberInTag remainingAddedLines of
                                Nothing ->
                                    go
                                        (lineNumberInTag + 1)
                                        (lineNumberInCurrentFile + 1)
                                        (hightlightLineNumber + 1)
                                        tailContent
                                        remainingAddedLines
                                        remainingDeletedLines
                                        { acc
                                            | contentWithDiffs = acc.contentWithDiffs ++ [ headContent ]
                                            , lineNumbersWithDiffs = acc.lineNumbersWithDiffs ++ [ Just lineNumberInCurrentFile ]
                                        }

                                Just nextAddedLine ->
                                    go
                                        (nextLineNumberIfSwallowedAlteredLine Insertion lineNumberInTag)
                                        (nextLineNumberInCurrentFileIfSwallowedAlteredLine Insertion lineNumberInCurrentFile)
                                        (hightlightLineNumber + 1)
                                        (nextContentIfSwallowedAlteredLines Insertion remainingContent)
                                        (List.drop 1 remainingAddedLines)
                                        remainingDeletedLines
                                        { acc
                                            | contentWithDiffs = acc.contentWithDiffs ++ [ nextAddedLine.content ]
                                            , greenLineRanges = acc.greenLineRanges ++ [ ( hightlightLineNumber, hightlightLineNumber ) ]
                                            , lineNumbersWithDiffs = acc.lineNumbersWithDiffs ++ [ Just lineNumberInCurrentFile ]
                                        }

                        Just nextDeletedLine ->
                            go
                                (nextLineNumberIfSwallowedAlteredLine Deletion lineNumberInTag)
                                (nextLineNumberInCurrentFileIfSwallowedAlteredLine Deletion lineNumberInCurrentFile)
                                (hightlightLineNumber + 1)
                                (nextContentIfSwallowedAlteredLines Deletion remainingContent)
                                remainingAddedLines
                                (List.drop 1 remainingDeletedLines)
                                { acc
                                    | contentWithDiffs = acc.contentWithDiffs ++ [ nextDeletedLine.content ]
                                    , redLineRanges = acc.redLineRanges ++ [ ( hightlightLineNumber, hightlightLineNumber ) ]
                                    , lineNumbersWithDiffs = acc.lineNumbersWithDiffs ++ [ Nothing ]
                                }
    in
    go
        startLineNumber
        (case fileLineNumberType of
            PreviousFileLineNumbers currentFileStartLineNumber ->
                currentFileStartLineNumber

            CurrentFileLineNumbers ->
                startLineNumber
        )
        startLineNumber
        content
        addedLines
        deletedLines
        { greenLineRanges = [], redLineRanges = [], contentWithDiffs = [], lineNumbersWithDiffs = [] }


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
    Decode.map4 FileReview
        (decodeFileReviewType tagStates)
        (Decode.field "currentFilePath" Decode.string)
        (Decode.field "currentLanguage" Language.decodeLanguage)
        (Decode.succeed False)


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
    Decode.map3 RenamedFileReview
        (Decode.field "previousFilePath" Decode.string)
        (Decode.field "previousLanguage" Language.decodeLanguage)
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
    decodeTagAndAlteredLinesAndReviewType tagStates
        |> Decode.andThen
            (\(TagAndAlteredLinesAndReviewType tag alteredLines reviewType) ->
                let
                    { redLineRanges, greenLineRanges, contentWithDiffs, lineNumbersWithDiffs } =
                        calculateRangesAndContentWithDiff
                            tag.startLine
                            tag.content
                            alteredLines
                            (case reviewType of
                                ReviewDeletedTag currentFileStartLineNumber ->
                                    PreviousFileLineNumbers currentFileStartLineNumber

                                ReviewNewTag _ ->
                                    CurrentFileLineNumbers

                                ReviewModifiedTag _ ->
                                    CurrentFileLineNumbers
                            )
                in
                Decode.map7 Review
                    (Decode.succeed reviewType)
                    (Decode.succeed tag)
                    (Decode.succeed alteredLines)
                    (Decode.succeed contentWithDiffs)
                    (Decode.succeed lineNumbersWithDiffs)
                    (Decode.succeed redLineRanges)
                    (Decode.succeed greenLineRanges)
            )


type TagAndAlteredLinesAndReviewType
    = TagAndAlteredLinesAndReviewType Tag (List AlteredLine) ReviewType


decodeTagAndAlteredLinesAndReviewType : ApprovedAndRejectedTags -> Decode.Decoder TagAndAlteredLinesAndReviewType
decodeTagAndAlteredLinesAndReviewType tagStates =
    Decode.map3 TagAndAlteredLinesAndReviewType
        (Decode.field "tag" <| decodeTag tagStates)
        (Decode.field "alteredLines" (Decode.list decodeAlteredLine))
        (Decode.field "reviewType" Decode.string
            |> Decode.andThen
                (\reviewType ->
                    case reviewType of
                        "new" ->
                            Decode.succeed <| ReviewNewTag True

                        "deleted" ->
                            Decode.field "currentFileStartLineNumber" Decode.int
                                |> Decode.map ReviewDeletedTag

                        "modified" ->
                            Decode.succeed <| ReviewModifiedTag True

                        _ ->
                            Decode.fail <| "Invalid review type: " ++ reviewType
                )
        )


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
                Decode.succeed Tag
                    |> required "tagType"
                        (Decode.string
                            |> Decode.andThen
                                (\tagType ->
                                    case tagType of
                                        "file" ->
                                            Decode.succeed FileTag

                                        "block" ->
                                            Decode.succeed BlockTag

                                        "line" ->
                                            Decode.succeed LineTag

                                        _ ->
                                            Decode.fail <| "Invalid tag type " ++ tagType
                                )
                        )
                    |> required "owner" Decode.string
                    |> required "startLine" Decode.int
                    |> required "endLine" Decode.int
                    |> required "tagAnnotationLine" Decode.int
                    |> required "content" (Decode.list Decode.string)
                    |> required "tagId" Decode.string
                    |> hardcoded
                        (if Set.member tagId approvedTags then
                            Approved

                         else if Set.member tagId rejectedTags then
                            Rejected

                         else
                            Neutral
                        )
                    |> hardcoded False
            )
