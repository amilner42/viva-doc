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
    , branchName : String
    , commitId : String
    , commitReview : RemoteData.RemoteData () CommitReview.CommitReview
    , displayOnlyUsersTags : Bool
    , displayOnlyTagsNeedingApproval : Bool

    -- TODO actual error type
    , approveDocsState : ApproveDocsState ()
    }


init : Session -> Int -> String -> String -> ( Model, Cmd Msg )
init session repoId branchName commitId =
    let
        model =
            { session = session
            , repoId = repoId
            , branchName = branchName
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
                , Api.getCommitReview repoId branchName commitId CompletedGetCommitReview
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
        :: List.map (renderFileReview username commitReview.requiredConfirmations approveDocsState) fileReviewsToRender


renderSummaryHeader : String -> ApproveDocsState err -> CommitReview.CommitReview -> Html.Html Msg
renderSummaryHeader username approveDocsState commitReview =
    let
        ownerTagStatuses : List CommitReview.OwnerTagStatus
        ownerTagStatuses =
            CommitReview.getOwnerTagStatuses commitReview

        totalConfirmationsRequired =
            List.length ownerTagStatuses

        remainingConfirmationsRequired =
            Set.size commitReview.requiredConfirmations

        currentConfirmations =
            totalConfirmationsRequired - remainingConfirmationsRequired

        totalTags =
            List.foldl (\ownerTagStatus acc -> acc + ownerTagStatus.totalTags) 0 ownerTagStatuses

        totalApprovedTags =
            List.foldl
                (\ownerTagStatus acc ->
                    (+) acc <|
                        case ownerTagStatus.status of
                            CommitReview.Confirmed ->
                                ownerTagStatus.totalTags

                            CommitReview.Unconfirmed approvedTagCount ->
                                approvedTagCount
                )
                0
                ownerTagStatuses

        statusSubtitle =
            String.fromInt currentConfirmations
                ++ " out of "
                ++ String.fromInt totalConfirmationsRequired
                ++ " docs approved"
                ++ ", "
                ++ String.fromInt totalApprovedTags
                ++ " out of "
                ++ String.fromInt totalTags
                ++ " tags approved"

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
                        , th [] [ text "Tags Approved" ]
                        , th [] [ text "Total Tags" ]
                        , th [] [ text "Docs Approved" ]
                        ]
                    ]
                , tbody [] <|
                    List.map
                        (\tagOwnerStatus ->
                            tr
                                []
                                [ td [] [ text tagOwnerStatus.username ]
                                , td []
                                    [ text <|
                                        String.fromInt <|
                                            case tagOwnerStatus.status of
                                                CommitReview.Confirmed ->
                                                    tagOwnerStatus.totalTags

                                                CommitReview.Unconfirmed approvedTags ->
                                                    approvedTags
                                    ]
                                , td [] [ text <| String.fromInt tagOwnerStatus.totalTags ]
                                , td []
                                    [ text <|
                                        case tagOwnerStatus.status of
                                            CommitReview.Confirmed ->
                                                "Yes"

                                            CommitReview.Unconfirmed _ ->
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
                case currentUserTagStatus.status of
                    CommitReview.Confirmed ->
                        div [ class "is-hidden" ] []

                    CommitReview.Unconfirmed approvedTags ->
                        div
                            [ class "tile section"
                            , style "margin-top" "-80px"
                            ]
                            [ if approvedTags == currentUserTagStatus.totalTags then
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
                                    [ text <|
                                        if (currentUserTagStatus.totalTags - approvedTags) == 1 then
                                            "approve 1 more tag to approve all your documentation"

                                        else
                                            "approve "
                                                ++ String.fromInt (currentUserTagStatus.totalTags - approvedTags)
                                                ++ " more tags to approve all your documentation"
                                    ]
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
renderFileReview username requiredConfirmations approveDocsState fileReview =
    div [ class "section" ] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            CommitReview.NewFileReview tags ->
                renderTags
                    username
                    "This tag has been added to a new file"
                    requiredConfirmations
                    CM.GreenBackground
                    approveDocsState
                    tags

            CommitReview.DeletedFileReview tags ->
                renderTags
                    username
                    "This tag is being removed inside a deleted file"
                    requiredConfirmations
                    CM.RedBackground
                    approveDocsState
                    tags

            CommitReview.ModifiedFileReview reviews ->
                renderReviews
                    username
                    requiredConfirmations
                    approveDocsState
                    reviews

            CommitReview.RenamedFileReview _ reviews ->
                renderReviews
                    username
                    requiredConfirmations
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
renderTags username description requiredConfirmations renderStyle approveDocsState tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview
                { renderStyle = renderStyle
                , username = username
                , description = description
                , requiredConfirmations = requiredConfirmations
                , approveDocsState = approveDocsState
                }
            )
            tags


renderReviews : String -> Set.Set String -> ApproveDocsState err -> List CommitReview.Review -> Html.Html Msg
renderReviews username requiredConfirmations approveDocsState reviews =
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
                    , requiredConfirmations = requiredConfirmations
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
    , requiredConfirmations : Set.Set String
    }
    -> CommitReview.Tag
    -> Html.Html Msg
renderTagOrReview { renderStyle, username, description, requiredConfirmations, approveDocsState } tag =
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
                                        CommitReview.Approved ->
                                            div
                                                [ class "level-right has-text-success" ]
                                                [ text "Approved" ]

                                        CommitReview.NotApproved ->
                                            div
                                                [ class "level-right has-text-danger" ]
                                                [ text "Requires Approval" ]

                                        CommitReview.RequestingApproval ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "requesting approval..." ]

                                        CommitReview.RequestingRejection ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "removing approval..." ]

                                        CommitReview.RequestFailed err ->
                                            div [ class "is-hidden" ] []
                                    ]
                                ]
                            , dt [] [ text <| "Owner: " ++ tag.owner ]
                            ]
                        , p [] [ text description ]
                        ]
                    , div [ class "buttons" ] <|
                        (if username /= tag.owner || (not <| Set.member username requiredConfirmations) then
                            []

                         else
                            case tag.approvedState of
                                CommitReview.Approved ->
                                    [ button
                                        [ class "button is-warning is-fullwidth has-text-white"
                                        , disabled <|
                                            case approveDocsState of
                                                RequestingDocApproval ->
                                                    True

                                                _ ->
                                                    False
                                        , onClick <| RejectTags <| Set.singleton tag.tagId
                                        ]
                                        [ text "Reject" ]
                                    ]

                                CommitReview.NotApproved ->
                                    [ button
                                        [ class "button is-success is-fullwidth"
                                        , disabled <|
                                            case approveDocsState of
                                                RequestingDocApproval ->
                                                    True

                                                _ ->
                                                    False
                                        , onClick <| ApproveTags <| Set.singleton tag.tagId
                                        ]
                                        [ text "Approve Tag" ]
                                    , button
                                        [ class "button is-link is-fullwidth" ]
                                        [ text "Update Docs" ]
                                    ]

                                CommitReview.RequestingApproval ->
                                    [ button
                                        [ class "button is-success is-fullwidth is-loading" ]
                                        []
                                    ]

                                CommitReview.RequestingRejection ->
                                    [ button
                                        [ class "button is-warning is-fullwidth is-loading" ]
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
    = CompletedGetCommitReview (Result.Result (Core.HttpError ()) Api.GetCommitReviewResponse)
    | SetDisplayOnlyUsersTags Bool
    | SetDisplayOnlyTagsNeedingApproval Bool
    | SetShowAlteredLines String Bool
    | ApproveTags (Set.Set String)
    | CompletedApproveTags (Set.Set String) (Result.Result (Core.HttpError ()) ())
    | RejectTags (Set.Set String)
    | CompletedRejectTags (Set.Set String) (Result.Result (Core.HttpError ()) ())
    | ApproveDocs String
    | CompletedApproveDocs String (Result.Result (Core.HttpError ()) ())


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetCommitReview (Result.Ok (Api.GetCommitReviewResponse commitReview user repos)) ->
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
            , Api.postApproveTags model.repoId model.branchName model.commitId tags (CompletedApproveTags tags)
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
                model.branchName
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
                                    { tag | approvedState = CommitReview.NotApproved }

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

        ApproveDocs username ->
            ( { model | approveDocsState = RequestingDocApproval }
            , Api.postApproveDocs model.repoId model.branchName model.commitId <| CompletedApproveDocs username
            )

        CompletedApproveDocs username (Ok _) ->
            ( { model
                | commitReview =
                    RemoteData.map
                        (\commitReview ->
                            { commitReview
                                | requiredConfirmations =
                                    Set.remove username commitReview.requiredConfirmations
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
