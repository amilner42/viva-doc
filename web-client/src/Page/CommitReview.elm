module Page.CommitReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import CommitReview
import CustomMarkdown as CM
import Html exposing (Html, button, div, dl, dt, hr, i, p, span, table, tbody, td, text, th, thead, tr)
import Html.Attributes exposing (class, classList, disabled, style)
import Html.Events exposing (onClick)
import RemoteData
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
    , commitReview : RemoteData.RemoteData () CommitReview.CommitReview
    , displayOnlyUsersTags : Bool
    , displayOnlyTagsNeedingApproval : Bool

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
            , displayOnlyUsersTags = False
            , displayOnlyTagsNeedingApproval = False
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

                        RemoteData.Failure _ ->
                            [ text "Uh oh" ]

                        RemoteData.Success commitReview ->
                            renderCommitReview
                                { username = Viewer.getUsername viewer
                                , approveDocsState = model.approveDocsState
                                , displayOnlyUsersTags = model.displayOnlyUsersTags
                                , displayOnlyTagsNeedingApproval = model.displayOnlyTagsNeedingApproval
                                }
                                commitReview
    }


renderCommitReview :
    { username : String
    , approveDocsState : ApproveDocsState err
    , displayOnlyUsersTags : Bool
    , displayOnlyTagsNeedingApproval : Bool
    }
    -> CommitReview.CommitReview
    -> List (Html.Html Msg)
renderCommitReview { username, displayOnlyUsersTags, displayOnlyTagsNeedingApproval, approveDocsState } commitReview =
    let
        fileReviewsToRender =
            CommitReview.filterFileReviews
                { filterForUser =
                    if displayOnlyUsersTags then
                        Just username

                    else
                        Nothing
                , filterApprovedTags = displayOnlyTagsNeedingApproval
                }
                commitReview.fileReviews

        totalReviews =
            CommitReview.countTotalReviewsAndTags commitReview.fileReviews

        displayingReviews =
            CommitReview.countTotalReviewsAndTags fileReviewsToRender
    in
    renderSummaryHeader username approveDocsState commitReview
        :: renderCommitReviewHeader
            displayOnlyUsersTags
            displayOnlyTagsNeedingApproval
            displayingReviews
            totalReviews
            commitReview
        :: List.map (renderFileReview username commitReview.remainingOwnersToApproveDocs approveDocsState) fileReviewsToRender


renderSummaryHeader : String -> ApproveDocsState err -> CommitReview.CommitReview -> Html.Html Msg
renderSummaryHeader username approveDocsState commitReview =
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
                                    case approveDocsState of
                                        RequestForDocApprovalErrored _ ->
                                            True

                                        _ ->
                                            False
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


renderCommitReviewHeader : Bool -> Bool -> Int -> Int -> CommitReview.CommitReview -> Html.Html Msg
renderCommitReviewHeader displayOnlyUsersTags displayOnlyTagsNeedingApproval displayingReviews totalReviews commitReview =
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
                , onClick <| SetDisplayOnlyUsersTags (not displayOnlyUsersTags)
                ]
                [ span [ class "icon is-small" ]
                    [ i
                        [ class "material-icons" ]
                        [ text <|
                            if displayOnlyUsersTags then
                                "check_box"

                            else
                                "check_box_outline_blank"
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


renderFileReview : String -> Set.Set String -> ApproveDocsState err -> CommitReview.FileReview -> Html.Html Msg
renderFileReview username remainingOwnersToApproveDocs approveDocsState fileReview =
    div [ class "section" ] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            CommitReview.NewFileReview tags ->
                renderTags
                    username
                    "This tag has been added to a new file"
                    remainingOwnersToApproveDocs
                    CM.GreenBackground
                    approveDocsState
                    tags

            CommitReview.DeletedFileReview tags ->
                renderTags
                    username
                    "This tag is being removed inside a deleted file"
                    remainingOwnersToApproveDocs
                    CM.RedBackground
                    approveDocsState
                    tags

            CommitReview.ModifiedFileReview reviews ->
                renderReviews
                    username
                    remainingOwnersToApproveDocs
                    approveDocsState
                    reviews

            CommitReview.RenamedFileReview _ reviews ->
                renderReviews
                    username
                    remainingOwnersToApproveDocs
                    approveDocsState
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


renderTags : String -> String -> Set.Set String -> CM.RenderStyle -> ApproveDocsState err -> List CommitReview.Tag -> Html.Html Msg
renderTags username description remainingOwnersToApproveDocs renderStyle approveDocsState tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview
                { renderStyle = renderStyle
                , username = username
                , description = description
                , remainingOwnersToApproveDocs = remainingOwnersToApproveDocs
                , approveDocsState = approveDocsState
                }
            )
            tags


renderReviews : String -> Set.Set String -> ApproveDocsState err -> List CommitReview.Review -> Html.Html Msg
renderReviews username remainingOwnersToApproveDocs approveDocsState reviews =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (\review ->
                renderTagOrReview
                    { renderStyle =
                        case review.reviewType of
                            CommitReview.ReviewNewTag ->
                                CM.PlainBackground

                            CommitReview.ReviewDeletedTag ->
                                CM.PlainBackground

                            CommitReview.ReviewModifiedTag showAlteredLines alteredLines ->
                                CM.MixedBackground { showAlteredLines = showAlteredLines, alteredLines = alteredLines }
                    , username = username
                    , description =
                        case review.reviewType of
                            CommitReview.ReviewNewTag ->
                                "This tag has been added to an existing file"

                            CommitReview.ReviewDeletedTag ->
                                "This tag has been deleted from an existing file"

                            CommitReview.ReviewModifiedTag _ _ ->
                                "This tag has been modified"
                    , remainingOwnersToApproveDocs = remainingOwnersToApproveDocs
                    , approveDocsState = approveDocsState
                    }
                    review.tag
            )
            reviews


renderTagOrReview :
    { renderStyle : CM.RenderStyle
    , username : String
    , description : String
    , approveDocsState : ApproveDocsState err
    , remainingOwnersToApproveDocs : Set.Set String
    }
    -> CommitReview.Tag
    -> Html.Html Msg
renderTagOrReview { renderStyle, username, description, remainingOwnersToApproveDocs, approveDocsState } tag =
    div [ class "tile is-parent" ]
        [ div
            [ class "tile is-8 is-child" ]
            (CM.getMarkdown tag.content tag.startLine "javascript" renderStyle)
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
                        , p [] [ text description ]
                        ]
                    , div [ class "buttons" ] <|
                        (if username /= tag.owner || (not <| Set.member username remainingOwnersToApproveDocs) then
                            []

                         else
                            let
                                requestingDocApproval =
                                    case approveDocsState of
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
                                        , disabled <| requestingDocApproval
                                        ]
                                        [ text "Approve" ]
                                    , button
                                        [ class "button is-danger is-fullwidth has-text-white"
                                        , onClick <| RejectTags <| Set.singleton tag.tagId
                                        , disabled <| requestingDocApproval
                                        ]
                                        [ text "Reject" ]
                                    ]

                                CommitReview.Approved ->
                                    [ button
                                        [ class "button is-success is-fullwidth is-outlined"
                                        , disabled <| requestingDocApproval
                                        , onClick <| RemoveApprovalOnTag tag.tagId
                                        ]
                                        [ text "Undo Approval" ]
                                    ]

                                CommitReview.Rejected ->
                                    [ button
                                        [ class "button is-fullwidth is-danger is-outlined"
                                        , disabled <| requestingDocApproval
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
                            ++ [ case renderStyle of
                                    CM.MixedBackground { showAlteredLines } ->
                                        button
                                            [ class "button is-info is-fullwidth"
                                            , onClick <| SetShowAlteredLines tag.tagId (not showAlteredLines)
                                            ]
                                            [ text <|
                                                if showAlteredLines then
                                                    "Hide Diff"

                                                else
                                                    "Show Diff"
                                            ]

                                    _ ->
                                        div [ class "is-hidden" ] []
                               ]
                    ]
                ]
            ]
        ]



-- UPDATE


type Msg
    = CompletedGetCommitReview (Result.Result (Core.HttpError ()) CommitReview.CommitReview)
    | SetDisplayOnlyUsersTags Bool
    | SetDisplayOnlyTagsNeedingApproval Bool
    | SetShowAlteredLines String Bool
    | ApproveTags (Set.Set String)
    | CompletedApproveTags (Set.Set String) (Result.Result (Core.HttpError ()) ())
    | RemoveApprovalOnTag String
    | CompletedRemoveApprovalOnTag String (Result.Result (Core.HttpError ()) ())
    | RejectTags (Set.Set String)
    | CompletedRejectTags (Set.Set String) (Result.Result (Core.HttpError ()) ())
    | RemoveRejectionOnTag String
    | CompletedRemoveRejectionOnTag String (Result.Result (Core.HttpError ()) ())
    | ApproveDocs String
    | CompletedApproveDocs String (Result.Result (Core.HttpError ()) ())


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetCommitReview (Result.Ok commitReview) ->
            ( { model | commitReview = RemoteData.Success commitReview }, Cmd.none )

        -- TODO handle error
        CompletedGetCommitReview (Result.Err err) ->
            ( { model | commitReview = RemoteData.Failure () }, Cmd.none )

        SetDisplayOnlyUsersTags displayOnlyUsersTags ->
            ( { model | displayOnlyUsersTags = displayOnlyUsersTags }, Cmd.none )

        SetDisplayOnlyTagsNeedingApproval displayOnlyTagsNeedingApproval ->
            ( { model | displayOnlyTagsNeedingApproval = displayOnlyTagsNeedingApproval }, Cmd.none )

        SetShowAlteredLines tagId showAlteredLines ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateReviews
                            (\review ->
                                if review.tag.tagId == tagId then
                                    { review
                                        | reviewType =
                                            case review.reviewType of
                                                CommitReview.ReviewModifiedTag _ alteredLines ->
                                                    CommitReview.ReviewModifiedTag showAlteredLines alteredLines

                                                CommitReview.ReviewNewTag ->
                                                    CommitReview.ReviewNewTag

                                                CommitReview.ReviewDeletedTag ->
                                                    CommitReview.ReviewDeletedTag
                                    }

                                else
                                    review
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
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

        -- TODO Probably better to feed commitReview throguh to avoid `RemoteData.map`
        CompletedApproveTags approvedTags (Ok ()) ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId approvedTags then
                                    { tag | approvedState = CommitReview.Approved }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

        -- TODO Handle error
        CompletedApproveTags attemptedApprovedTags _ ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId attemptedApprovedTags then
                                    { tag | approvedState = CommitReview.RequestFailed () }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

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
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if tag.tagId == tagId then
                                    { tag | approvedState = CommitReview.Neutral }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

        CompletedRemoveApprovalOnTag tagId (Result.Err _) ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if tag.tagId == tagId then
                                    { tag | approvedState = CommitReview.RequestFailed () }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

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
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = CommitReview.Rejected }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

        -- TODO handle errors
        CompletedRejectTags attemptedRejectTags _ ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId attemptedRejectTags then
                                    { tag | approvedState = CommitReview.RequestFailed () }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

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
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if tag.tagId == tagId then
                                    { tag | approvedState = CommitReview.Neutral }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

        CompletedRemoveRejectionOnTag tagId (Result.Err _) ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (CommitReview.updateTags
                            (\tag ->
                                if tag.tagId == tagId then
                                    { tag | approvedState = CommitReview.RequestFailed () }

                                else
                                    tag
                            )
                        )
                        model.commitReview
              }
            , Cmd.none
            )

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
        CompletedApproveDocs username (Err _) ->
            ( { model | approveDocsState = RequestForDocApprovalErrored () }, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
