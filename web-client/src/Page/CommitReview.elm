module Page.CommitReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import Api.Errors.GetCommitReview as GcrError
import Api.Errors.PostUserAssessments as PuaError
import Api.Responses.GetCommitReview as GcrResponse
import Api.Responses.PostUserAssessments as PuaResponse
import CodeEditor
import CommitReview
import Html exposing (Html, a, button, dd, div, dl, dt, hr, i, li, ol, p, progress, section, span, table, tbody, td, text, th, thead, tr)
import Html.Attributes exposing (class, classList, disabled, max, style, value)
import Html.Events exposing (onClick)
import Language
import OwnerGroup as OG
import Ports
import Progress
import RemoteData
import Route
import Session exposing (Session)
import Set
import UserAssessment as UA
import Viewer
import Words



-- MODEL


type alias Model =
    { session : Session.Session
    , repoId : Int
    , prNumber : Int
    , commitId : String
    , commitReview :
        RemoteData.RemoteData (Core.HttpError GcrError.GetCommitReviewError) GcrResponse.CommitReviewResponse
    , displayFilter : CommitReview.ViewFilterOption
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
            , displayFilter = CommitReview.ViewAllTags
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
                                            , displayFilter = model.displayFilter
                                            , isCommitStale = model.commitId /= headCommitId
                                            }
                                            commitReview
    }


renderCommitReview :
    { username : String
    , displayFilter : CommitReview.ViewFilterOption
    , isCommitStale : Bool
    }
    -> CommitReview.CommitReview
    -> List (Html.Html Msg)
renderCommitReview config commitReview =
    let
        tagCountBreakdown =
            CommitReview.getTagCountBreakdownForFiles commitReview.fileReviews

        displayingReviewsCount =
            CommitReview.countVisibleReviewsAndTags commitReview.fileReviews

        docReviewTagIds =
            CommitReview.getTagIdsInDocReview commitReview

        status =
            renderStatus
                { totalTagCount = tagCountBreakdown.totalCount
                , approvedTagCount = tagCountBreakdown.approvedCount
                , rejectedTagCount = tagCountBreakdown.rejectedCount
                , unresolvedTagCount = tagCountBreakdown.unresolvedCount
                , docReviewTagIds = docReviewTagIds
                , displayFilter = config.displayFilter
                , username = config.username
                }

        commitReviewHeader =
            renderCommitReviewHeader
                { username = config.username
                , displayFilter = config.displayFilter
                , displayingReviewsCount = displayingReviewsCount
                , totalReviewsCount = tagCountBreakdown.totalCount
                }

        noReviewsDisplayedText =
            if displayingReviewsCount == 0 then
                renderNoReviewsDisplayedText
                    { displayFilter = config.displayFilter, docReviewTagIds = docReviewTagIds }

            else
                div [ class "is-hidden" ] []

        fileReviews =
            commitReview.fileReviews
                |> List.map (renderFileReview config)
    in
    if tagCountBreakdown.totalCount == 0 then
        [ div
            [ class "title has-text-centered" ]
            [ text "No documentation needs review" ]
        , div
            [ class "subtitle has-text-centered" ]
            [ text "Let's call it a day and grab a beer..." ]
        ]

    else
        -- NOTE We always render the file reviews and hide them with "is-hidden" because of the nature of elm's VDOM
        -- not being aware of the code editors. This prevents us from calling to the port every time as they stay
        -- rendered but hidden.
        status
            :: commitReviewHeader
            :: noReviewsDisplayedText
            :: fileReviews


type alias RenderStatusConfig =
    { totalTagCount : Int
    , approvedTagCount : Int
    , rejectedTagCount : Int
    , unresolvedTagCount : Int
    , docReviewTagIds : CommitReview.DocReviewTagIds
    , displayFilter : CommitReview.ViewFilterOption
    , username : String
    }


renderStatus : RenderStatusConfig -> Html Msg
renderStatus config =
    let
        submitReviewButton =
            renderSubmitReviewButton
                { username = config.username
                , displayFilter = config.displayFilter
                , docReviewTagIds = config.docReviewTagIds
                }
    in
    div
        []
        [ div
            [ class "title" ]
            [ text "Status Summary" ]
        , Progress.progress
            { height = "30px"
            , bars =
                [ { color = Progress.Success
                  , widthPercent = toFloat config.approvedTagCount / toFloat config.totalTagCount * 100
                  , text = Just "approved"
                  }
                , { color = Progress.Danger
                  , widthPercent = toFloat config.rejectedTagCount / toFloat config.totalTagCount * 100
                  , text = Just "rejected"
                  }
                ]
            }
        , div
            [ class "section"
            , style "padding-top" "10px"
            ]
            [ div
                []
                [ text <|
                    Words.singularAndPlural
                        { count = config.totalTagCount
                        , singular = "There is 1 tag."
                        , pluralPrefix = "There are a total of "
                        , pluralSuffix = " tags."
                        }
                ]
            , div
                []
                [ text <|
                    Words.singularAndPlural
                        { count = config.approvedTagCount
                        , singular = "1 tag has been approved."
                        , pluralPrefix = ""
                        , pluralSuffix = " tags have been approved."
                        }
                ]
            , div
                []
                [ text <|
                    Words.singularAndPlural
                        { count = config.rejectedTagCount
                        , singular = "1 tag has been rejected."
                        , pluralPrefix = ""
                        , pluralSuffix = " tags have been rejected."
                        }
                ]
            , div
                []
                [ text <|
                    Words.singularAndPlural
                        { count = config.unresolvedTagCount
                        , singular = "1 tag remains unresolved."
                        , pluralPrefix = ""
                        , pluralSuffix = " tags remain unresolved."
                        }
                ]
            ]
        , submitReviewButton
        ]


type alias RenderSubmitReviewButtonConfig =
    { displayFilter : CommitReview.ViewFilterOption
    , docReviewTagIds : CommitReview.DocReviewTagIds
    , username : String
    }


renderSubmitReviewButton : RenderSubmitReviewButtonConfig -> Html Msg
renderSubmitReviewButton config =
    if CommitReview.hasTagsInDocReview config.docReviewTagIds then
        div
            [ class "section", style "margin-top" "-50px" ]
            [ button
                [ class "button is-success is-large is-outlined is-fullwidth"
                , onClick <| SubmitDocReview config.username config.docReviewTagIds
                ]
                [ text <|
                    "Submit "
                        ++ Words.pluralizeWithNumericPrefix
                            (CommitReview.markedForApprovalCount config.docReviewTagIds)
                            "Approval"
                        ++ " and "
                        ++ Words.pluralizeWithNumericPrefix
                            (CommitReview.markedForRejectionCount config.docReviewTagIds)
                            "Rejection"
                ]
            ]

    else
        div [ class "is-hidden" ] []


type alias RenderNoReviewsDisplayedTextConfig =
    { displayFilter : CommitReview.ViewFilterOption
    , docReviewTagIds : CommitReview.DocReviewTagIds
    }


renderNoReviewsDisplayedText : RenderNoReviewsDisplayedTextConfig -> Html Msg
renderNoReviewsDisplayedText config =
    div
        [ class "section has-text-centered" ]
        (case config.displayFilter of
            -- Impossible case, if no tags require review we don't call `noDisplayedReviewsText`
            CommitReview.ViewAllTags ->
                []

            CommitReview.ViewTagsThatRequireUserAssessment username ->
                if CommitReview.hasTagsInDocReview config.docReviewTagIds then
                    [ div
                        [ class "subtitle has-text-centered" ]
                        [ text "You have assessed all documentation under your responsibility" ]
                    ]

                else
                    [ div
                        [ class "subtitle has-text-centered" ]
                        [ text "nothing requires your approval" ]
                    ]

            CommitReview.ViewTagsInCurrentDocReview ->
                [ div
                    [ class "subtitle has-text-centered" ]
                    [ text "you have no assessments to submit" ]
                ]
        )


type alias RenderCommitReviewHeaderConfig =
    { username : String
    , displayFilter : CommitReview.ViewFilterOption
    , displayingReviewsCount : Int
    , totalReviewsCount : Int
    }


renderCommitReviewHeader : RenderCommitReviewHeaderConfig -> Html.Html Msg
renderCommitReviewHeader config =
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
                        [ text "Documentation Review" ]
                    , span
                        [ class "has-text-grey is-size-6" ]
                        [ text <|
                            "displaying "
                                ++ String.fromInt config.displayingReviewsCount
                                ++ " of "
                                ++ String.fromInt config.totalReviewsCount
                                ++ " tags"
                        ]
                    ]
                ]
            ]
        , div [ class "buttons level-right" ]
            [ button
                [ class "button is-rounded"
                , onClick <| SetDisplayFilter CommitReview.ViewAllTags
                ]
                [ span [ class "icon is-small" ]
                    [ i
                        [ class "material-icons" ]
                        [ text <|
                            case config.displayFilter of
                                CommitReview.ViewAllTags ->
                                    "radio_button_checked"

                                _ ->
                                    "radio_button_unchecked"
                        ]
                    ]
                , div [] [ text "All" ]
                ]
            , button
                [ class "button is-rounded"
                , onClick <| SetDisplayFilter <| CommitReview.ViewTagsThatRequireUserAssessment config.username
                ]
                [ span
                    [ class "icon is-small" ]
                    [ i
                        [ class "material-icons" ]
                        [ text <|
                            case config.displayFilter of
                                CommitReview.ViewTagsThatRequireUserAssessment _ ->
                                    "radio_button_checked"

                                _ ->
                                    "radio_button_unchecked"
                        ]
                    ]
                , div [] [ text "Requires Your Assessment" ]
                ]
            , button
                [ class "button is-rounded"
                , onClick <| SetDisplayFilter CommitReview.ViewTagsInCurrentDocReview
                ]
                [ span
                    [ class "icon is-small" ]
                    [ i
                        [ class "material-icons" ]
                        [ text <|
                            case config.displayFilter of
                                CommitReview.ViewTagsInCurrentDocReview ->
                                    "radio_button_checked"

                                _ ->
                                    "radio_button_unchecked"
                        ]
                    ]
                , div [] [ text "Ready for Submission" ]
                ]
            ]
        ]


type alias RenderFileReviewConfig =
    { username : String
    , isCommitStale : Bool
    , displayFilter : CommitReview.ViewFilterOption
    }


renderFileReview : RenderFileReviewConfig -> CommitReview.FileReview -> Html.Html Msg
renderFileReview config fileReview =
    div [ classList [ ( "section", True ), ( "is-hidden", fileReview.isHidden ) ] ] <|
        [ renderFileReviewHeader fileReview.currentFilePath fileReview.fileReviewType
        , case fileReview.fileReviewType of
            CommitReview.NewFileReview tags ->
                renderTags
                    config.username
                    "This tag has been added to a new file"
                    config.isCommitStale
                    fileReview.currentLanguage
                    tags

            CommitReview.DeletedFileReview tags ->
                renderTags
                    config.username
                    "This tag is being removed inside a deleted file"
                    config.isCommitStale
                    fileReview.currentLanguage
                    tags

            CommitReview.ModifiedFileReview reviews ->
                renderReviews
                    config.username
                    config.isCommitStale
                    fileReview.currentLanguage
                    reviews

            CommitReview.RenamedFileReview _ _ reviews ->
                renderReviews
                    config.username
                    config.isCommitStale
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
    let
        ownerGroups =
            renderOwnerGroupsForTag
                tag.ownerGroups
                tag.userAssessments
    in
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
                        [ dl [] <|
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
                                                [ text <| "You " ++ UA.prettyPrintAssessmentType assessmentType ++ " this tag" ]

                                        CommitReview.InDocReviewBeingSubmitted assessmentType ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text <| "Requesting " ++ UA.prettyPrintAssessmentType assessmentType ++ "..." ]

                                        CommitReview.NonNeutral assessmentType ->
                                            div
                                                [ classList
                                                    [ ( "level-right", True )
                                                    , ( "has-text-success", UA.isApproved assessmentType )
                                                    , ( "has-text-danger", UA.isRejected assessmentType )
                                                    ]
                                                ]
                                                [ text <| UA.prettyPrintAssessmentTypeWithCapital assessmentType ]

                                        CommitReview.RequestFailed err ->
                                            div [ class "is-hidden" ] []
                                    ]
                                ]
                            ]
                                ++ ownerGroups
                        , p [ style "margin-top" "20px" ] [ text config.description ]
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


renderOwnerGroupsForTag : List OG.OwnerGroup -> List UA.UserAssessment -> List (Html msg)
renderOwnerGroupsForTag ownerGroups userAssessments =
    let
        renderGroup group =
            let
                isApprovedGroup =
                    List.any
                        (\owner ->
                            List.any
                                (UA.isAll [ .assessmentType >> UA.isApproved, UA.isForUser owner ])
                                userAssessments
                        )
                        group

                isRejectedGroup =
                    List.any
                        (\owner ->
                            List.any
                                (UA.isAll [ .assessmentType >> UA.isRejected, UA.isForUser owner ])
                                userAssessments
                        )
                        group
            in
            dd
                [ class "level"
                , style "margin" "5px 0 5px 10px"
                ]
                [ div [ class "level-left" ] <|
                    [ span [ class "icon is-small" ]
                        [ i
                            [ classList
                                [ ( "material-icons", True )
                                , ( "has-text-light", not isApprovedGroup && not isRejectedGroup )
                                , ( "has-text-success", isApprovedGroup )
                                , ( "has-text-danger", isRejectedGroup )
                                ]
                            ]
                            [ text <|
                                case ( isRejectedGroup, isApprovedGroup ) of
                                    ( True, False ) ->
                                        "indeterminate_check_box"

                                    ( True, True ) ->
                                        "indeterminate_check_box"

                                    ( False, True ) ->
                                        "check_box"

                                    ( False, False ) ->
                                        "check_box_outline_blank"
                            ]
                        ]
                    , span [ style "white-space" "pre" ] [ text " " ]
                    ]
                        ++ List.map renderOwner group
                ]

        renderOwner owner =
            span
                [ style "white-space" "pre"
                , classList
                    [ ( "has-text-success"
                      , List.any (UA.isAll [ UA.isForUser owner, .assessmentType >> UA.isApproved ]) userAssessments
                      )
                    , ( "has-text-danger"
                      , List.any (UA.isAll [ UA.isForUser owner, .assessmentType >> UA.isRejected ]) userAssessments
                      )
                    ]
                ]
                [ text <| "  " ++ owner ]
    in
    [ dt [] [ text <| "Owner Groups" ] ]
        ++ List.map renderGroup ownerGroups


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



-- UPDATE


type Msg
    = CompletedGetCommitReview (Result.Result (Core.HttpError GcrError.GetCommitReviewError) GcrResponse.CommitReviewResponse)
    | SetDisplayFilter CommitReview.ViewFilterOption
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

        SetDisplayFilter viewFilterOption ->
            ( { model
                | displayFilter = viewFilterOption
                , commitReview =
                    model.commitReview
                        |> updateCompleteCommitReview
                            (CommitReview.updateCommitReviewForDisplayFilter viewFilterOption)
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
                        |> updateCompleteCommitReview
                            (CommitReview.updateCommitReviewForDisplayFilter model.displayFilter)
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
                        |> updateCompleteCommitReview
                            (CommitReview.updateCommitReviewForDisplayFilter model.displayFilter)
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
                        |> updateCompleteCommitReview
                            (CommitReview.updateCommitReviewForDisplayFilter model.displayFilter)
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
                                |> updateCompleteCommitReview
                                    (CommitReview.updateCommitReviewForDisplayFilter model.displayFilter)
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
