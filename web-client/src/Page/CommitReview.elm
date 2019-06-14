module Page.CommitReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import Api.Errors.CommitReviewAction as CraError
import Api.Errors.GetCommitReview as GcrError
import CodeEditor
import CommitReview
import Html exposing (Html, a, button, div, dl, dt, hr, i, p, section, span, table, tbody, td, text, th, thead, tr)
import Html.Attributes exposing (class, classList, disabled, style)
import Html.Events exposing (onClick)
import Ports
import RemoteData
import Route
import Session exposing (Session)
import Set
import Viewer



-- MODEL


type ApproveDocsState err
    = NotRequesting
    | RequestingDocApproval
    | RequestForDocApprovalErrored err


type alias Model =
    { session : Session.Session
    , repoId : Int
    , prNumber : Int
    , commitId : String
    , commitReview : RemoteData.RemoteData (Core.HttpError GcrError.GetCommitReviewError) CommitReview.CommitReview
    , displayOnlyUsersTags : Maybe String
    , displayOnlyTagsNeedingApproval : Bool
    , modalClosed : Bool

    -- TODO actual error type
    , approveDocsState : ApproveDocsState ()
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
            , approveDocsState = NotRequesting
            }
    in
    case session of
        -- TODO
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

                        RemoteData.Success commitReview ->
                            if commitReview.headCommitId == model.commitId || model.modalClosed then
                                renderCommitReview
                                    { username = Viewer.getUsername viewer
                                    , approveDocsState = model.approveDocsState
                                    , displayOnlyUsersTags = model.displayOnlyUsersTags
                                    , displayOnlyTagsNeedingApproval = model.displayOnlyTagsNeedingApproval
                                    , isCommitStale = model.commitId /= commitReview.headCommitId
                                    }
                                    commitReview

                            else
                                renderHeadUpdatedModal
                                    commitReview
                                    """This commit is stale! You can continue to browse to see what was previosly
                                    approved/rejected but if you would like to make changes you must go to the most
                                    recent commit in the PR.
                                    """
                                    (Route.CommitReview model.repoId model.prNumber commitReview.headCommitId)
    }


renderCommitReview :
    { username : String
    , approveDocsState : ApproveDocsState err
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
    in
    renderSummaryHeader config.username config.approveDocsState config.isCommitStale commitReview
        :: renderCommitReviewHeader
            config.username
            config.displayOnlyUsersTags
            config.displayOnlyTagsNeedingApproval
            displayingReviews
            totalReviews
            commitReview
        :: List.map
            (renderFileReview
                config.username
                commitReview.remainingOwnersToApproveDocs
                config.approveDocsState
                config.isCommitStale
            )
            commitReview.fileReviews


renderSummaryHeader : String -> ApproveDocsState err -> Bool -> CommitReview.CommitReview -> Html.Html Msg
renderSummaryHeader username approveDocsState isCommitStale commitReview =
    let
        ownerTagStatuses : List CommitReview.OwnerTagStatus
        ownerTagStatuses =
            CommitReview.getOwnerTagStatuses commitReview

        totalConfirmationsRequired =
            List.length ownerTagStatuses

        remainingConfirmationsRequired =
            Set.size commitReview.remainingOwnersToApproveDocs

        currentConfirmations =
            totalConfirmationsRequired - remainingConfirmationsRequired

        totalTags =
            List.foldl (\ownerTagStatus acc -> acc + ownerTagStatus.totalTags) 0 ownerTagStatuses

        totalNeutralTags =
            List.foldl
                (\ownerTagStatus acc -> acc + ownerTagStatus.approvedTags)
                0
                ownerTagStatuses

        statusSubtitle =
            String.fromInt currentConfirmations
                ++ " out of "
                ++ String.fromInt totalConfirmationsRequired
                ++ " owners have approved their documentation"

        maybeCurrentUserTagStatus : Maybe CommitReview.OwnerTagStatus
        maybeCurrentUserTagStatus =
            List.filter (.username >> (==) username) ownerTagStatuses |> List.head
    in
    div
        [ class "tile is-vertical" ]
        [ div
            [ class "tile" ]
            [ div
                []
                [ span
                    [ class "has-text-black-ter is-size-3 title"
                    , style "padding-right" "15px"
                    ]
                    [ text "Status" ]
                , span
                    [ class "has-text-grey is-size-6" ]
                    [ text <| statusSubtitle ]
                ]
            ]
        , div
            [ class "tile section"
            ]
            [ table
                [ class "table is-striped is-bordered is-fullwidth is-narrow" ]
                [ thead
                    []
                    [ tr
                        []
                        [ th [] [ text "Owner" ]
                        , th [] [ text "Total Tags" ]
                        , th [] [ text "Tags Approved" ]
                        , th [] [ text "Tags Rejected" ]
                        , th [] [ text "Unresolved Tags" ]
                        , th [] [ text "Docs Approved" ]
                        ]
                    ]
                , tbody [] <|
                    List.map
                        (\tagOwnerStatus ->
                            tr
                                []
                                [ td [] [ text tagOwnerStatus.username ]
                                , td [] [ text <| String.fromInt tagOwnerStatus.totalTags ]
                                , td [] [ text <| String.fromInt tagOwnerStatus.approvedTags ]
                                , td [] [ text <| String.fromInt tagOwnerStatus.rejectedTags ]
                                , td [] [ text <| String.fromInt tagOwnerStatus.neutralTags ]
                                , td []
                                    [ text <|
                                        if tagOwnerStatus.approvedDocs then
                                            "Yes"

                                        else
                                            "No"
                                    ]
                                ]
                        )
                        ownerTagStatuses
                ]
            ]
        , case maybeCurrentUserTagStatus of
            Nothing ->
                div [ class "is-hidden" ] []

            Just currentUserTagStatus ->
                if currentUserTagStatus.approvedDocs then
                    div [ class "is-hidden" ] []

                else
                    div
                        [ class "tile section"
                        , style "margin-top" "-80px"
                        ]
                        [ if currentUserTagStatus.approvedTags == currentUserTagStatus.totalTags then
                            button
                                [ class "button is-fullwidth is-success"
                                , classList
                                    [ ( "is-loading"
                                      , case approveDocsState of
                                            RequestingDocApproval ->
                                                True

                                            _ ->
                                                False
                                      )
                                    ]
                                , disabled <|
                                    isCommitStale
                                        || (case approveDocsState of
                                                RequestForDocApprovalErrored _ ->
                                                    True

                                                _ ->
                                                    False
                                           )
                                , style "height" "52px"
                                , onClick <| ApproveDocs username
                                ]
                                [ text <|
                                    case approveDocsState of
                                        -- TODO handle error better
                                        RequestForDocApprovalErrored err ->
                                            "Internal Error"

                                        _ ->
                                            "approve all your documentation"
                                ]

                          else
                            button
                                [ class "button is-fullwidth is-success"
                                , style "height" "52px"
                                , disabled True
                                ]
                                [ text "approving documentation is disabled until all your tags approved" ]
                        ]
        ]


renderCommitReviewHeader : String -> Maybe String -> Bool -> Int -> Int -> CommitReview.CommitReview -> Html.Html Msg
renderCommitReviewHeader username displayOnlyUsersTags displayOnlyTagsNeedingApproval displayingReviews totalReviews commitReview =
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


renderFileReview : String -> Set.Set String -> ApproveDocsState err -> Bool -> CommitReview.FileReview -> Html.Html Msg
renderFileReview username remainingOwnersToApproveDocs approveDocsState isCommitStale fileReview =
    div [ classList [ ( "section", True ), ( "is-hidden", fileReview.isHidden ) ] ] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            CommitReview.NewFileReview tags ->
                renderTags
                    username
                    "This tag has been added to a new file"
                    remainingOwnersToApproveDocs
                    approveDocsState
                    isCommitStale
                    tags

            CommitReview.DeletedFileReview tags ->
                renderTags
                    username
                    "This tag is being removed inside a deleted file"
                    remainingOwnersToApproveDocs
                    approveDocsState
                    isCommitStale
                    tags

            CommitReview.ModifiedFileReview reviews ->
                renderReviews
                    username
                    remainingOwnersToApproveDocs
                    approveDocsState
                    isCommitStale
                    reviews

            CommitReview.RenamedFileReview _ reviews ->
                renderReviews
                    username
                    remainingOwnersToApproveDocs
                    approveDocsState
                    isCommitStale
                    reviews
        ]


renderFileReviewHeader : CommitReview.FileReview -> Html.Html Msg
renderFileReviewHeader fileReview =
    div
        [ style "padding-bottom" "15px" ]
        [ span
            [ class "has-text-black-ter is-size-3"
            , style "padding-right" "10px"
            ]
            [ text fileReview.currentFilePath ]
        , span
            [ class "has-text-grey is-size-6" ]
            [ text <|
                case fileReview.fileReviewType of
                    CommitReview.NewFileReview _ ->
                        "new file"

                    CommitReview.ModifiedFileReview _ ->
                        "modified file"

                    CommitReview.DeletedFileReview _ ->
                        "deleted file"

                    CommitReview.RenamedFileReview _ _ ->
                        "renamed file"
            ]
        ]


renderTags :
    String
    -> String
    -> Set.Set String
    -> ApproveDocsState err
    -> Bool
    -> List CommitReview.Tag
    -> Html.Html Msg
renderTags username description remainingOwnersToApproveDocs approveDocsState isCommitStale tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview
                { username = username
                , description = description
                , remainingOwnersToApproveDocs = remainingOwnersToApproveDocs
                , approveDocsState = approveDocsState
                , isCommitStale = isCommitStale
                , maybeReview = Nothing
                }
            )
            tags


renderReviews :
    String
    -> Set.Set String
    -> ApproveDocsState err
    -> Bool
    -> List CommitReview.Review
    -> Html.Html Msg
renderReviews username remainingOwnersToApproveDocs approveDocsState isCommitStale reviews =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (\review ->
                renderTagOrReview
                    { username = username
                    , description =
                        case review.reviewType of
                            CommitReview.ReviewNewTag _ ->
                                "This tag has been added to an existing file"

                            CommitReview.ReviewDeletedTag ->
                                "This tag has been deleted from an existing file"

                            CommitReview.ReviewModifiedTag _ ->
                                "This tag has been modified"
                    , remainingOwnersToApproveDocs = remainingOwnersToApproveDocs
                    , approveDocsState = approveDocsState
                    , isCommitStale = isCommitStale
                    , maybeReview = Just review
                    }
                    review.tag
            )
            reviews


renderTagOrReview :
    { username : String
    , description : String
    , approveDocsState : ApproveDocsState err
    , remainingOwnersToApproveDocs : Set.Set String
    , isCommitStale : Bool
    , maybeReview : Maybe CommitReview.Review
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

                                        CommitReview.Approved ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Approved" ]

                                        CommitReview.Rejected ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Rejected" ]

                                        CommitReview.RequestingApproval ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Requesting approval..." ]

                                        CommitReview.RequestingRejection ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Requesting rejection..." ]

                                        CommitReview.RequestingRemoveApproval ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Removing approval..." ]

                                        CommitReview.RequestingRemoveRejection ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "Removing rejection..." ]

                                        CommitReview.RequestFailed err ->
                                            div [ class "is-hidden" ] []
                                    ]
                                ]
                            , dt [] [ text <| "Owner: " ++ tag.owner ]
                            ]
                        , p [] [ text config.description ]
                        ]
                    , div [ class "buttons" ] <|
                        (if
                            (config.username /= tag.owner)
                                || (not <| Set.member config.username config.remainingOwnersToApproveDocs)
                         then
                            []

                         else
                            let
                                requestingDocApproval =
                                    case config.approveDocsState of
                                        RequestingDocApproval ->
                                            True

                                        _ ->
                                            False
                            in
                            case tag.approvedState of
                                CommitReview.Neutral ->
                                    [ button
                                        [ class "button is-success is-fullwidth has-text-white"
                                        , onClick <| ApproveTags <| Set.singleton tag.tagId
                                        , disabled <| requestingDocApproval || config.isCommitStale
                                        ]
                                        [ text "Approve" ]
                                    , button
                                        [ class "button is-danger is-fullwidth has-text-white"
                                        , onClick <| RejectTags <| Set.singleton tag.tagId
                                        , disabled <| requestingDocApproval || config.isCommitStale
                                        ]
                                        [ text "Reject" ]
                                    ]

                                CommitReview.Approved ->
                                    [ button
                                        [ class "button is-success is-fullwidth is-outlined"
                                        , disabled <| requestingDocApproval || config.isCommitStale
                                        , onClick <| RemoveApprovalOnTag tag.tagId
                                        ]
                                        [ text "Undo Approval" ]
                                    ]

                                CommitReview.Rejected ->
                                    [ button
                                        [ class "button is-fullwidth is-danger is-outlined"
                                        , disabled <| requestingDocApproval || config.isCommitStale
                                        , onClick <| RemoveRejectionOnTag tag.tagId
                                        ]
                                        [ text "Undo Rejection" ]
                                    ]

                                CommitReview.RequestingApproval ->
                                    [ button
                                        [ class "button is-success is-fullwidth is-loading" ]
                                        []
                                    , button
                                        [ class "button is-danger is-fullwidth  has-text-white"
                                        , disabled True
                                        ]
                                        [ text "Reject" ]
                                    ]

                                CommitReview.RequestingRejection ->
                                    [ button
                                        [ class "button is-success is-fullwidth"
                                        , disabled True
                                        ]
                                        [ text "Approve" ]
                                    , button
                                        [ class "button is-danger is-fullwidth is-loading" ]
                                        []
                                    ]

                                CommitReview.RequestingRemoveApproval ->
                                    [ button
                                        [ class "button is-success is-fullwidth is-outlined is-loading" ]
                                        []
                                    ]

                                CommitReview.RequestingRemoveRejection ->
                                    [ button
                                        [ class "button is-danger is-fullwidth is-outlined is-loading" ]
                                        []
                                    ]

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
                                                    , onClick <| SetShowAlteredLines review
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

                                            CommitReview.ReviewDeletedTag ->
                                                div [ class "is-hidden" ] []

                                            CommitReview.ReviewModifiedTag showingDiff ->
                                                diffButton showingDiff
                               ]
                    ]
                ]
            ]
        ]


renderHeadUpdatedModal : CommitReview.CommitReview -> String -> Route.Route -> List (Html.Html Msg)
renderHeadUpdatedModal commitReview modalText headCommitRoute =
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
                        , onClick <| SetModalClosed True commitReview
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

                        GcrError.CommitAnalysisPending ->
                            """The analysis for this commit is currently being computed, refresh the page in a little
                                bit. Once the status for this commit is set on Github, you can be sure you can find the
                                commit here."""
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
    = CompletedGetCommitReview (Result.Result (Core.HttpError GcrError.GetCommitReviewError) CommitReview.CommitReview)
    | SetDisplayOnlyUsersTags (Maybe String) String
    | SetDisplayOnlyTagsNeedingApproval Bool
    | SetShowAlteredLines CommitReview.Review
    | ApproveTags (Set.Set String)
    | CompletedApproveTags (Set.Set String) (Result.Result (Core.HttpError CraError.CommitReviewActionError) ())
    | RemoveApprovalOnTag String
    | CompletedRemoveApprovalOnTag String (Result.Result (Core.HttpError CraError.CommitReviewActionError) ())
    | RejectTags (Set.Set String)
    | CompletedRejectTags (Set.Set String) (Result.Result (Core.HttpError CraError.CommitReviewActionError) ())
    | RemoveRejectionOnTag String
    | CompletedRemoveRejectionOnTag String (Result.Result (Core.HttpError CraError.CommitReviewActionError) ())
    | ApproveDocs String
    | CompletedApproveDocs String (Result.Result (Core.HttpError CraError.CommitReviewActionError) ())
    | SetModalClosed Bool CommitReview.CommitReview


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    let
        handleCommitReviewActionErrorOnTag tagIds err =
            ( case err of
                Core.BadStatus _ (CraError.StaleCommitError newHeadCommitId) ->
                    { model
                        | commitReview =
                            model.commitReview
                                |> RemoteData.map
                                    (\commitReview ->
                                        { commitReview | headCommitId = newHeadCommitId }
                                    )
                                |> RemoteData.map
                                    (CommitReview.updateTags
                                        (\tag ->
                                            if Set.member tag.tagId tagIds then
                                                { tag | approvedState = CommitReview.Neutral }

                                            else
                                                tag
                                        )
                                    )
                    }

                _ ->
                    { model
                        | commitReview =
                            RemoteData.map
                                (CommitReview.updateTags
                                    (\tag ->
                                        if Set.member tag.tagId tagIds then
                                            { tag | approvedState = CommitReview.RequestFailed () }

                                        else
                                            tag
                                    )
                                )
                                model.commitReview
                    }
            , Cmd.none
            )
    in
    case msg of
        CompletedGetCommitReview (Result.Ok commitReview) ->
            ( { model | commitReview = RemoteData.Success commitReview }
            , if commitReview.headCommitId == model.commitId then
                Ports.renderCodeEditors <| CommitReview.extractRenderEditorConfigs commitReview

              else
                -- Opening modal, render code editor when modal closes.
                Cmd.none
            )

        -- TODO handle error
        CompletedGetCommitReview (Result.Err err) ->
            ( { model | commitReview = RemoteData.Failure err }, Cmd.none )

        SetDisplayOnlyUsersTags displayOnlyUsersTags username ->
            ( { model
                | displayOnlyUsersTags = displayOnlyUsersTags
                , commitReview =
                    model.commitReview
                        |> RemoteData.map
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
                        |> RemoteData.map
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = model.displayOnlyUsersTags
                                , filterApprovedTags = displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        SetShowAlteredLines forReview ->
            let
                updatedReview =
                    { forReview
                        | reviewType =
                            case forReview.reviewType of
                                CommitReview.ReviewModifiedTag showAlteredLines ->
                                    CommitReview.ReviewModifiedTag <| not showAlteredLines

                                CommitReview.ReviewNewTag showAlteredLines ->
                                    CommitReview.ReviewNewTag <| not showAlteredLines

                                CommitReview.ReviewDeletedTag ->
                                    CommitReview.ReviewDeletedTag
                    }
            in
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateReviews
                            (\review ->
                                if review.tag.tagId == updatedReview.tag.tagId then
                                    updatedReview

                                else
                                    review
                            )
                        )
                        model.commitReview
              }
            , Ports.rerenderCodeEditor <| CommitReview.renderConfigForReviewOrTag <| CommitReview.AReview updatedReview
            )

        ApproveTags tags ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = CommitReview.RequestingApproval }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Api.postApproveTags model.repoId model.prNumber model.commitId tags (CompletedApproveTags tags)
            )

        CompletedApproveTags approvedTags (Ok ()) ->
            ( { model
                | commitReview =
                    model.commitReview
                        |> RemoteData.map
                            (CommitReview.updateTags
                                (\tag ->
                                    if Set.member tag.tagId approvedTags then
                                        { tag | approvedState = CommitReview.Approved }

                                    else
                                        tag
                                )
                            )
                        |> RemoteData.map
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = model.displayOnlyUsersTags
                                , filterApprovedTags = model.displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        CompletedApproveTags attemptedApprovedTags (Result.Err err) ->
            handleCommitReviewActionErrorOnTag attemptedApprovedTags err

        RemoveApprovalOnTag tagId ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if tag.tagId == tagId then
                                    { tag | approvedState = CommitReview.RequestingRemoveApproval }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Api.deleteApprovedTag model.repoId model.prNumber model.commitId tagId (CompletedRemoveApprovalOnTag tagId)
            )

        CompletedRemoveApprovalOnTag tagId (Result.Ok ()) ->
            ( { model
                | commitReview =
                    model.commitReview
                        |> RemoteData.map
                            (CommitReview.updateTags
                                (\tag ->
                                    if tag.tagId == tagId then
                                        { tag | approvedState = CommitReview.Neutral }

                                    else
                                        tag
                                )
                            )
                        |> RemoteData.map
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = model.displayOnlyUsersTags
                                , filterApprovedTags = model.displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        CompletedRemoveApprovalOnTag tagId (Result.Err err) ->
            handleCommitReviewActionErrorOnTag (Set.singleton tagId) err

        RejectTags tags ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = CommitReview.RequestingRejection }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Api.postRejectTags
                model.repoId
                model.prNumber
                model.commitId
                tags
                (CompletedRejectTags tags)
            )

        CompletedRejectTags tags (Ok ()) ->
            ( { model
                | commitReview =
                    model.commitReview
                        |> RemoteData.map
                            (CommitReview.updateTags
                                (\tag ->
                                    if Set.member tag.tagId tags then
                                        { tag | approvedState = CommitReview.Rejected }

                                    else
                                        tag
                                )
                            )
                        |> RemoteData.map
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = model.displayOnlyUsersTags
                                , filterApprovedTags = model.displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        CompletedRejectTags attemptedRejectTags (Result.Err err) ->
            handleCommitReviewActionErrorOnTag attemptedRejectTags err

        RemoveRejectionOnTag tagId ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if tag.tagId == tagId then
                                    { tag | approvedState = CommitReview.RequestingRemoveRejection }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Api.deleteRejectedTag
                model.repoId
                model.prNumber
                model.commitId
                tagId
                (CompletedRemoveRejectionOnTag tagId)
            )

        CompletedRemoveRejectionOnTag tagId (Result.Ok ()) ->
            ( { model
                | commitReview =
                    model.commitReview
                        |> RemoteData.map
                            (CommitReview.updateTags
                                (\tag ->
                                    if tag.tagId == tagId then
                                        { tag | approvedState = CommitReview.Neutral }

                                    else
                                        tag
                                )
                            )
                        |> RemoteData.map
                            (CommitReview.updateCommitReviewForSearch
                                { filterForUser = model.displayOnlyUsersTags
                                , filterApprovedTags = model.displayOnlyTagsNeedingApproval
                                }
                            )
              }
            , Cmd.none
            )

        CompletedRemoveRejectionOnTag tagId (Result.Err err) ->
            handleCommitReviewActionErrorOnTag (Set.singleton tagId) err

        ApproveDocs username ->
            ( { model | approveDocsState = RequestingDocApproval }
            , Api.postApproveDocs model.repoId model.prNumber model.commitId <| CompletedApproveDocs username
            )

        CompletedApproveDocs username (Ok _) ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (\commitReview ->
                            { commitReview
                                | remainingOwnersToApproveDocs =
                                    Set.remove username commitReview.remainingOwnersToApproveDocs
                            }
                        )
                        model.commitReview
                , approveDocsState = NotRequesting
              }
            , Cmd.none
            )

        -- TODO handle error
        CompletedApproveDocs username (Result.Err err) ->
            case err of
                Core.BadStatus _ (CraError.StaleCommitError newHeadCommitId) ->
                    ( { model
                        | commitReview =
                            RemoteData.map
                                (\commitReview ->
                                    { commitReview | headCommitId = newHeadCommitId }
                                )
                                model.commitReview
                      }
                    , Cmd.none
                    )

                _ ->
                    ( { model | approveDocsState = RequestForDocApprovalErrored () }, Cmd.none )

        SetModalClosed modalClosed commitReview ->
            ( { model | modalClosed = modalClosed }
            , if modalClosed then
                Ports.renderCodeEditors <| CommitReview.extractRenderEditorConfigs commitReview

              else
                Cmd.none
            )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
