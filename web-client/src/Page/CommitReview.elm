module Page.CommitReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import Api.Errors.GetCommitReview as GcrError
import Api.Errors.PostUserAssessments as PuaError
import Api.Responses.GetCommitReview as GcrResponse
import Api.Responses.PostUserAssessments as PuaResponse
import CodeEditor
import CommitReview
import Html exposing (Html, a, button, div, dl, dt, hr, i, li, ol, p, progress, section, span, table, tbody, td, text, th, thead, tr)
import Html.Attributes exposing (class, classList, disabled, style)
import Html.Events exposing (onClick)
import Language
import OwnerGroup as OG
import Ports
import RemoteData
import Route
import Session exposing (Session)
import Set
import UserAssessment as UA
import Viewer



-- MODEL


type alias Model =
    { session : Session.Session
    , repoId : Int
    , prNumber : Int
    , commitId : String
    , commitReview :
        RemoteData.RemoteData (Core.HttpError GcrError.GetCommitReviewError) GcrResponse.CommitReviewResponse
    , displayOnlyUsersTags : Maybe String
    , displayOnlyTagsNeedingApproval : Bool
    , modalClosed : Bool
    , submitDocReviewState :
        RemoteData.RemoteData (Core.HttpError PuaError.PostUserAssessmentsError) PuaResponse.PostUserAssessmentsResponse
    }


init : Session -> Int -> Int -> String -> ( Model, Cmd Msg )
init session repoId prNumber commitId =
    let
        model =
            { session = session
            , repoId = repoId
            , prNumber = prNumber
            , commitId = commitId
            , commitReview = RemoteData.NotAsked
            , displayOnlyUsersTags = Nothing
            , displayOnlyTagsNeedingApproval = False
            , modalClosed = False
            , submitDocReviewState = RemoteData.NotAsked
            }
    in
    case session of
        Session.Guest _ ->
            ( model, Cmd.none )

        Session.LoggedIn _ viewer ->
            let
                -- TODO
                -- Check that the viewer has that repoId listed, they might have had their permissions withdrawn
                -- in the meantime but this is a minimum client-side check.
                userHasAccessToThisRepo =
                    True
            in
            if userHasAccessToThisRepo then
                ( { model | commitReview = RemoteData.Loading }
                , Api.getCommitReview repoId prNumber commitId CompletedGetCommitReview
                )

            else
                ( model, Cmd.none )



-- VIEW


view : Model -> { title : String, content : Html Msg }
view model =
    { title = "Review"
    , content =
        div [ class "section" ] <|
            case model.session of
                Session.Guest _ ->
                    [ text "You need to be logged in to view this page..." ]

                Session.LoggedIn _ viewer ->
                    case model.commitReview of
                        RemoteData.NotAsked ->
                            [ text "Logged in... " ]

                        RemoteData.Loading ->
                            [ text "Loading review..." ]

                        RemoteData.Failure err ->
                            renderGetCommitReviewErrorModal err

                        RemoteData.Success { headCommitId, responseType } ->
                            if headCommitId /= model.commitId && not model.modalClosed then
                                renderHeadUpdatedModal
                                    responseType
                                    """This commit is stale! You can continue to browse to see what was previosly
                                approved/rejected but if you would like to make changes you must go to the most
                                recent commit in the PR.
                                """
                                    (Route.CommitReview model.repoId model.prNumber headCommitId)

                            else
                                case responseType of
                                    GcrResponse.Pending forCommits ->
                                        renderPendingAnalysisPane model.commitId forCommits

                                    GcrResponse.AnalysisFailed withReason ->
                                        renderAnalysisFailedPane withReason

                                    GcrResponse.Complete commitReview ->
                                        renderCommitReview
                                            { username = Viewer.getUsername viewer
                                            , displayOnlyUsersTags = model.displayOnlyUsersTags
                                            , displayOnlyTagsNeedingApproval = model.displayOnlyTagsNeedingApproval
                                            , isCommitStale = model.commitId /= headCommitId
                                            }
                                            commitReview
    }


renderCommitReview :
    { username : String
    , displayOnlyUsersTags : Maybe String
    , displayOnlyTagsNeedingApproval : Bool
    , isCommitStale : Bool
    }
    -> CommitReview.CommitReview
    -> List (Html.Html Msg)
renderCommitReview config commitReview =
    let
        totalReviews =
            CommitReview.countTotalReviewsAndTags commitReview.fileReviews

        displayingReviews =
            CommitReview.countVisibleReviewsAndTags commitReview.fileReviews

        commitReviewHeader =
            renderCommitReviewHeader
                config.username
                config.displayOnlyUsersTags
                config.displayOnlyTagsNeedingApproval
                displayingReviews
                totalReviews

        ({ markedForApprovalTagIds, markedForRejectionTagIds } as docReviewTagIds) =
            CommitReview.getTagIdsInDocReview commitReview

        anyTagsInDocReview =
            Set.size markedForApprovalTagIds + Set.size markedForRejectionTagIds > 0

        fileReviews =
            commitReview.fileReviews
                |> List.map (renderFileReview config.username config.isCommitStale)

        approveDocButton =
            if anyTagsInDocReview then
                div
                    [ class "section"
                    , style "margin-top" "0px"
                    , style "padding-top" "0px"
                    ]
                    [ button
                        [ class "button is-success is-fullwidth is-large"
                        , onClick <| SubmitDocReview config.username docReviewTagIds
                        ]
                        [ text "Submit Documentation Review" ]
                    , text <| prettyPrintApproveDocSubtitle markedForApprovalTagIds markedForRejectionTagIds
                    ]

            else
                div [ class "is-hidden" ] []
    in
    approveDocButton :: commitReviewHeader :: fileReviews


renderCommitReviewHeader : String -> Maybe String -> Bool -> Int -> Int -> Html.Html Msg
renderCommitReviewHeader username displayOnlyUsersTags displayOnlyTagsNeedingApproval displayingReviews totalReviews =
    div
        [ class "level is-mobile"
        , style "margin-bottom" "0px"
        ]
        [ div
            [ class "level-left" ]
            [ div
                [ class "level-item" ]
                [ div
                    []
                    [ span
                        [ class "has-text-black-ter is-size-3 title"
                        , style "padding-right" "15px"
                        ]
                        [ text "Reviews" ]
                    , span
                        [ class "has-text-grey is-size-6" ]
                        [ text <|
                            if displayingReviews == totalReviews then
                                "displaying all " ++ String.fromInt totalReviews ++ " reviews"

                            else
                                "displaying "
                                    ++ String.fromInt displayingReviews
                                    ++ " of "
                                    ++ String.fromInt totalReviews
                                    ++ " reviews"
                        ]
                    ]
                ]
            ]
        , div [ class "buttons level-right" ]
            [ button
                [ class "button"
                , onClick <|
                    SetDisplayOnlyUsersTags
                        (case displayOnlyUsersTags of
                            Nothing ->
                                Just username

                            Just _ ->
                                Nothing
                        )
                        username
                ]
                [ span [ class "icon is-small" ]
                    [ i
                        [ class "material-icons" ]
                        [ text <|
                            case displayOnlyUsersTags of
                                Nothing ->
                                    "check_box_outline_blank"

                                Just _ ->
                                    "check_box"
                        ]
                    ]
                , div [] [ text "Your Tags" ]
                ]
            , button
                [ class "button"
                , onClick <| SetDisplayOnlyTagsNeedingApproval (not displayOnlyTagsNeedingApproval)
                ]
                [ span
                    [ class "icon is-small" ]
                    [ i
                        [ class "material-icons" ]
                        [ text <|
                            if displayOnlyTagsNeedingApproval then
                                "check_box"

                            else
                                "check_box_outline_blank"
                        ]
                    ]
                , div [] [ text "Requires Approval" ]
                ]
            ]
        ]


renderFileReview : String -> Bool -> CommitReview.FileReview -> Html.Html Msg
renderFileReview username isCommitStale fileReview =
    div [ classList [ ( "section", True ), ( "is-hidden", fileReview.isHidden ) ] ] <|
        [ renderFileReviewHeader fileReview.currentFilePath fileReview.fileReviewType
        , case fileReview.fileReviewType of
            CommitReview.NewFileReview tags ->
                renderTags
                    username
                    "This tag has been added to a new file"
                    isCommitStale
                    fileReview.currentLanguage
                    tags

            CommitReview.DeletedFileReview tags ->
                renderTags
                    username
                    "This tag is being removed inside a deleted file"
                    isCommitStale
                    fileReview.currentLanguage
                    tags

            CommitReview.ModifiedFileReview reviews ->
                renderReviews
                    username
                    isCommitStale
                    fileReview.currentLanguage
                    reviews

            CommitReview.RenamedFileReview _ _ reviews ->
                renderReviews
                    username
                    isCommitStale
                    fileReview.currentLanguage
                    reviews
        ]


renderFileReviewHeader : String -> CommitReview.FileReviewType -> Html.Html Msg
renderFileReviewHeader currentFilePath fileReviewType =
    div
        [ style "padding-bottom" "15px" ]
        [ span
            [ class "has-text-black-ter is-size-3"
            , style "padding-right" "10px"
            ]
            [ text currentFilePath ]
        , span
            [ class "has-text-grey is-size-6" ]
            [ text <|
                case fileReviewType of
                    CommitReview.NewFileReview _ ->
                        "new file"

                    CommitReview.ModifiedFileReview _ ->
                        "modified file"

                    CommitReview.DeletedFileReview _ ->
                        "deleted file"

                    CommitReview.RenamedFileReview _ _ _ ->
                        "renamed file"
            ]
        ]


renderTags :
    String
    -> String
    -> Bool
    -> Language.Language
    -> List CommitReview.Tag
    -> Html.Html Msg
renderTags username description isCommitStale language tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview
                { username = username
                , description = description
                , isCommitStale = isCommitStale
                , maybeReview = Nothing
                , language = language
                }
            )
            tags


renderReviews :
    String
    -> Bool
    -> Language.Language
    -> List CommitReview.Review
    -> Html.Html Msg
renderReviews username isCommitStale language reviews =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (\review ->
                renderTagOrReview
                    { username = username
                    , description =
                        case review.reviewType of
                            CommitReview.ReviewNewTag _ ->
                                "This tag has been added to an existing file"

                            CommitReview.ReviewDeletedTag _ ->
                                "This tag has been deleted from an existing file"

                            CommitReview.ReviewModifiedTag _ ->
                                "This tag has been modified"
                    , isCommitStale = isCommitStale
                    , maybeReview = Just review
                    , language = language
                    }
                    review.tag
            )
            reviews


renderTagOrReview :
    { username : String
    , description : String
    , isCommitStale : Bool
    , maybeReview : Maybe CommitReview.Review
    , language : Language.Language
    }
    -> CommitReview.Tag
    -> Html.Html Msg
renderTagOrReview config tag =
    div [ classList [ ( "tile is-parent", True ), ( "is-hidden", tag.isHidden ) ] ]
        [ div
            [ class "tile is-8 is-child has-code-editor" ]
            [ CodeEditor.codeEditor tag.tagId ]
        , div
            [ class "tile is-4"
            ]
            [ div [ style "width" "100%" ]
                [ div
                    [ class "box is-light-grey"
                    , style "margin-left" "10px"
                    , style "width" "100%"
                    , style "border-radius" "0"
                    ]
                    [ div
                        [ class "content is-small" ]
                        [ dl
                            []
                            [ dt
                                []
                                [ div [ class "level" ]
                                    [ div [ class "level-left" ]
                                        [ text <| CommitReview.readableTagType tag.tagType ]
                                    , case tag.approvedState of
                                        CommitReview.Neutral ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Unresolved" ]

                                        CommitReview.InDocReview assessmentType ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text <| UA.prettyPrintAssessmentTypeWithCapital assessmentType ++ " in Current Doc Review" ]

                                        CommitReview.InDocReviewBeingSubmitted assessmentType ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text <| "Requesting " ++ UA.prettyPrintAssessmentType assessmentType ++ "..." ]

                                        CommitReview.NonNeutral assessmentType ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text <| UA.prettyPrintAssessmentTypeWithCapital assessmentType ]

                                        CommitReview.RequestFailed err ->
                                            div [ class "is-hidden" ] []
                                    ]
                                ]
                            , dt [] [ text <| "Owner: " ++ "TODO" ]
                            ]
                        , p [] [ text config.description ]
                        ]
                    , div [ class "buttons" ] <|
                        (if
                            (not <| OG.isUserInAnyGroup config.username tag.ownerGroups)
                                || List.any (UA.isForUser config.username) tag.userAssessments
                         then
                            []

                         else
                            case tag.approvedState of
                                CommitReview.Neutral ->
                                    [ button
                                        [ class "button is-success is-fullwidth has-text-white"
                                        , onClick <| AddToDocReview UA.Approved tag.tagId
                                        , disabled <| config.isCommitStale
                                        ]
                                        [ text "Docs look good" ]
                                    , button
                                        [ class "button is-danger is-fullwidth has-text-white"
                                        , onClick <| AddToDocReview UA.Rejected tag.tagId
                                        , disabled <| config.isCommitStale
                                        ]
                                        [ text "Docs require fix" ]
                                    ]

                                CommitReview.InDocReview assessmentType ->
                                    [ button
                                        [ class "button is-fullwidth is-outlined"
                                        , onClick <| RemoveFromDocReview tag.tagId
                                        , disabled <| config.isCommitStale
                                        ]
                                        [ text "Remove from Doc Review" ]
                                    ]

                                CommitReview.InDocReviewBeingSubmitted assessmentType ->
                                    [ button
                                        [ class "button is-fullwidth is-outlined is-loading" ]
                                        []
                                    ]

                                CommitReview.NonNeutral assessmentType ->
                                    []

                                -- TODO handle error better?
                                CommitReview.RequestFailed err ->
                                    [ button
                                        [ class "button is-danger is-fullwidth"
                                        , disabled True
                                        ]
                                        [ text "Internal Error" ]
                                    ]
                        )
                            ++ [ case config.maybeReview of
                                    Nothing ->
                                        div [ class "is-hidden" ] []

                                    Just review ->
                                        let
                                            diffButton showingDiff =
                                                button
                                                    [ class "button is-info is-fullwidth"
                                                    , onClick <| SetShowAlteredLines config.language review
                                                    ]
                                                    [ text <|
                                                        if showingDiff then
                                                            "Hide Diff"

                                                        else
                                                            "Show Diff"
                                                    ]
                                        in
                                        case review.reviewType of
                                            CommitReview.ReviewNewTag showingDiff ->
                                                diffButton showingDiff

                                            CommitReview.ReviewDeletedTag _ ->
                                                div [ class "is-hidden" ] []

                                            CommitReview.ReviewModifiedTag showingDiff ->
                                                diffButton showingDiff
                               ]
                    ]
                ]
            ]
        ]


renderHeadUpdatedModal : GcrResponse.CommitReviewResponseType -> String -> Route.Route -> List (Html.Html Msg)
renderHeadUpdatedModal gcrResponseType modalText headCommitRoute =
    [ div
        [ class "modal is-active" ]
        [ div [ class "modal-background" ] []
        , div
            [ class "modal-card" ]
            [ section
                [ class "modal-card-body"
                , style "border-radius" "10px"
                ]
                [ div
                    [ class "content" ]
                    [ text modalText ]
                , div
                    [ class "buttons are-large is-centered" ]
                    [ button
                        [ class "button is-info is-fullwidth"
                        , onClick <| SetModalClosed True gcrResponseType
                        ]
                        [ text "browse stale commit" ]
                    , a
                        [ class "button is-link is-fullwidth"
                        , Route.href headCommitRoute
                        ]
                        [ text "jump to most recent commit" ]
                    ]
                ]
            ]
        ]
    ]


renderPendingAnalysisPane : String -> List String -> List (Html.Html Msg)
renderPendingAnalysisPane currentCommitId forCommits =
    [ div
        [ class "section has-text-centered" ]
        [ div [ class "title" ] [ text "Documentation Being Analyzed" ]
        , div [ class "subtitle" ] [ text "refresh the page in a bit..." ]
        , progress
            [ class "progress is-small is-success"
            , style "width" "50%"
            , style "margin" "auto"
            , style "margin-bottom" "20px"
            ]
            []
        , div
            [ class "content" ]
            (case forCommits of
                [ _ ] ->
                    [ text "this commit is being analyzed" ]

                _ ->
                    [ text "Commits Queued for Analysis"
                    , ol [] <|
                        List.map
                            (\commitId ->
                                li
                                    [ classList
                                        [ ( "has-text-weight-bold"
                                          , commitId == currentCommitId
                                          )
                                        ]
                                    ]
                                    [ text commitId ]
                            )
                            forCommits
                    ]
            )
        ]
    ]


renderAnalysisFailedPane : String -> List (Html.Html Msg)
renderAnalysisFailedPane withReason =
    [ div
        [ class "section has-text-centered" ]
        [ div [ class "title" ] [ text "Analysis Error" ]
        , div [ class "subtitle" ] [ text "VivaDoc was unable to analyze this commit" ]
        , hr
            [ style "width" "50%"
            , style "margin" "auto"
            , style "margin-bottom" "20px"
            ]
            []
        , p [ class "content has-text-grey" ] [ text withReason ]
        ]
    ]


renderGetCommitReviewErrorModal : Core.HttpError GcrError.GetCommitReviewError -> List (Html.Html Msg)
renderGetCommitReviewErrorModal httpError =
    let
        internalErrorText =
            "Internal Error...try to refresh the page in a bit!"

        modalText =
            case httpError of
                Core.BadUrl string ->
                    internalErrorText

                Core.Timeout ->
                    "There was a timeout trying to retrieve the commit analysis...try again in a bit."

                Core.NetworkError ->
                    "There seems to be a network error, are you connected to the internet? Refresh the page once you are."

                Core.BadSuccessBody string ->
                    internalErrorText

                Core.BadErrorBody string ->
                    internalErrorText

                Core.BadStatus int getCommitReviewErrorGcrError ->
                    case getCommitReviewErrorGcrError of
                        GcrError.UnknownError ->
                            internalErrorText
    in
    [ div
        [ class "modal is-active" ]
        [ div [ class "modal-background" ] []
        , div
            [ class "modal-card" ]
            [ section
                [ class "modal-card-body"
                , style "border-radius" "10px"
                ]
                [ div
                    [ class "content" ]
                    [ text modalText ]
                ]
            ]
        ]
    ]


prettyPrintApproveDocSubtitle : Set.Set String -> Set.Set String -> String
prettyPrintApproveDocSubtitle approvedTags rejectedTags =
    "TODO"



-- UPDATE


type Msg
    = CompletedGetCommitReview (Result.Result (Core.HttpError GcrError.GetCommitReviewError) GcrResponse.CommitReviewResponse)
    | SetDisplayOnlyUsersTags (Maybe String) String
    | SetDisplayOnlyTagsNeedingApproval Bool
    | SetShowAlteredLines Language.Language CommitReview.Review
    | SetModalClosed Bool GcrResponse.CommitReviewResponseType
    | AddToDocReview UA.AssessmentType String
    | RemoveFromDocReview String
    | SubmitDocReview String CommitReview.DocReviewTagIds
    | CompletedSubmitDocReview String CommitReview.DocReviewTagIds (Result.Result (Core.HttpError PuaError.PostUserAssessmentsError) PuaResponse.PostUserAssessmentsResponse)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    let
        updateCompleteCommitReview updater modelCommitReview =
            modelCommitReview |> (RemoteData.map << GcrResponse.mapComplete) updater
    in
    case msg of
        CompletedGetCommitReview (Result.Ok response) ->
            ( { model | commitReview = RemoteData.Success response }
            , case response.responseType of
                GcrResponse.Complete commitReview ->
                    if response.headCommitId == model.commitId then
                        Ports.renderCodeEditors <|
                            CommitReview.extractRenderEditorConfigs commitReview

                    else
                        Cmd.none

                _ ->
                    Cmd.none
            )

        CompletedGetCommitReview (Result.Err err) ->
            ( { model | commitReview = RemoteData.Failure err }, Cmd.none )

        SetDisplayOnlyUsersTags displayOnlyUsersTags username ->
            ( { model
                | displayOnlyUsersTags = displayOnlyUsersTags
                , commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = displayOnlyUsersTags
                                , filterApprovedTags = model.displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        SetDisplayOnlyTagsNeedingApproval displayOnlyTagsNeedingApproval ->
            ( { model
                | displayOnlyTagsNeedingApproval = displayOnlyTagsNeedingApproval
                , commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = model.displayOnlyUsersTags
                                , filterApprovedTags = displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        SetShowAlteredLines language forReview ->
            let
                updatedReview =
                    { forReview
                        | reviewType =
                            case forReview.reviewType of
                                CommitReview.ReviewModifiedTag showAlteredLines ->
                                    CommitReview.ReviewModifiedTag <| not showAlteredLines

                                CommitReview.ReviewNewTag showAlteredLines ->
                                    CommitReview.ReviewNewTag <| not showAlteredLines

                                CommitReview.ReviewDeletedTag currentFileStartLineNumber ->
                                    CommitReview.ReviewDeletedTag currentFileStartLineNumber
                    }
            in
            ( { model
                | commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateReviews
                                (\review ->
                                    if review.tag.tagId == updatedReview.tag.tagId then
                                        updatedReview

                                    else
                                        review
                                )
                            )
              }
            , Ports.rerenderCodeEditor <|
                CommitReview.renderConfigForReviewOrTag language (CommitReview.AReview updatedReview)
            )

        SetModalClosed modalClosed gcrResponseType ->
            ( { model | modalClosed = modalClosed }
            , case ( gcrResponseType, modalClosed ) of
                ( GcrResponse.Complete commitReview, True ) ->
                    Ports.renderCodeEditors <| CommitReview.extractRenderEditorConfigs commitReview

                _ ->
                    Cmd.none
            )

        AddToDocReview assessmentType tagId ->
            ( { model
                | commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateTagApprovalState
                                { tagId = tagId, approvalState = CommitReview.InDocReview assessmentType }
                            )
              }
            , Cmd.none
            )

        RemoveFromDocReview tagId ->
            ( { model
                | commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateTagApprovalState
                                { tagId = tagId, approvalState = CommitReview.Neutral }
                            )
              }
            , Cmd.none
            )

        SubmitDocReview username ({ markedForApprovalTagIds, markedForRejectionTagIds } as docReviewTagIds) ->
            ( { model
                | submitDocReviewState = RemoteData.Loading
                , commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateApprovalStatesForTags <|
                                CommitReview.docReviewTagIdsToTagAndApprovalState
                                    docReviewTagIds
                                    CommitReview.InDocReviewBeingSubmitted
                            )
              }
            , Api.postUserAssessments
                model.repoId
                model.prNumber
                model.commitId
                markedForApprovalTagIds
                markedForRejectionTagIds
                (CompletedSubmitDocReview username docReviewTagIds)
            )

        CompletedSubmitDocReview username _ (Result.Ok response) ->
            ( { model
                -- TODO If any of the responses failed set RemoteData to `RemoteData.Success` and render error
                -- Right now we just internal error the tags and this is sub-par
                | submitDocReviewState = RemoteData.NotAsked
                , commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateTags
                                (\tag ->
                                    case PuaResponse.getResponseForTagId tag.tagId response of
                                        Nothing ->
                                            tag

                                        Just { responseType } ->
                                            case responseType of
                                                PuaResponse.ApprovalSuccess isApproved ->
                                                    { tag
                                                        | userAssessments =
                                                            { tagId = tag.tagId
                                                            , username = username
                                                            , assessmentType = UA.Approved
                                                            }
                                                                :: tag.userAssessments
                                                        , approvedState =
                                                            if isApproved then
                                                                CommitReview.NonNeutral UA.Approved

                                                            else
                                                                CommitReview.Neutral
                                                    }

                                                PuaResponse.RejectionSuccess ->
                                                    { tag
                                                        | userAssessments =
                                                            { tagId = tag.tagId
                                                            , username = username
                                                            , assessmentType = UA.Rejected
                                                            }
                                                                :: tag.userAssessments
                                                        , approvedState = CommitReview.NonNeutral UA.Rejected
                                                    }

                                                PuaResponse.ApprovalFailure ->
                                                    { tag | approvedState = CommitReview.RequestFailed () }

                                                PuaResponse.RejectionFailure ->
                                                    { tag | approvedState = CommitReview.RequestFailed () }
                                )
                            )
              }
            , Cmd.none
            )

        CompletedSubmitDocReview _ docReviewTagIds (Result.Err err) ->
            let
                neutralTagAndApprovalStates =
                    CommitReview.docReviewTagIdsToTagAndApprovalState
                        docReviewTagIds
                        (always CommitReview.Neutral)

                updateCommitReviewDocTagIdsToNeutral =
                    CommitReview.updateApprovalStatesForTags neutralTagAndApprovalStates
            in
            ( case err of
                Core.BadStatus _ (PuaError.StaleCommitError newHeadCommitId) ->
                    { model
                        | submitDocReviewState = RemoteData.NotAsked
                        , commitReview =
                            model.commitReview
                                |> updateCompleteCommitReview updateCommitReviewDocTagIdsToNeutral
                                |> RemoteData.map (\crr -> { crr | headCommitId = newHeadCommitId })
                    }

                _ ->
                    { model
                        | submitDocReviewState = RemoteData.Failure err
                        , commitReview =
                            model.commitReview |> updateCompleteCommitReview updateCommitReviewDocTagIdsToNeutral
                    }
            , Cmd.none
            )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
