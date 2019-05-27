module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import BranchReview
import CustomMarkdown as CM
import Html exposing (Html, button, div, dl, dt, i, p, span, text)
import Html.Attributes exposing (class, classList, disabled, style)
import Html.Events exposing (onClick)
import RemoteData
import Session exposing (Session)
import Set
import Viewer



-- MODEL


type alias Model =
    { session : Session.Session
    , repoId : Int
    , branchName : String
    , commitId : String
    , branchReview : RemoteData.RemoteData () BranchReview.BranchReview
    , displayOnlyUsersTags : Bool
    , displayOnlyTagsNeedingApproval : Bool
    }


init : Session -> Int -> String -> String -> ( Model, Cmd Msg )
init session repoId branchName commitId =
    let
        model =
            { session = session
            , repoId = repoId
            , branchName = branchName
            , commitId = commitId
            , branchReview = RemoteData.NotAsked
            , displayOnlyUsersTags = False
            , displayOnlyTagsNeedingApproval = False
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
                ( { model | branchReview = RemoteData.Loading }
                , Api.getBranchReview repoId branchName commitId CompletedGetBranchReview
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
                    case model.branchReview of
                        RemoteData.NotAsked ->
                            [ text "Logged in... " ]

                        RemoteData.Loading ->
                            [ text "Loading review..." ]

                        RemoteData.Failure _ ->
                            [ text "Uh oh" ]

                        RemoteData.Success branchReview ->
                            renderBranchReview
                                { username = Viewer.getUsername viewer
                                , displayOnlyUsersTags = model.displayOnlyUsersTags
                                , displayOnlyTagsNeedingApproval = model.displayOnlyTagsNeedingApproval
                                }
                                branchReview
    }


renderBranchReview :
    { username : String
    , displayOnlyUsersTags : Bool
    , displayOnlyTagsNeedingApproval : Bool
    }
    -> BranchReview.BranchReview
    -> List (Html.Html Msg)
renderBranchReview { username, displayOnlyUsersTags, displayOnlyTagsNeedingApproval } branchReview =
    let
        fileReviewsToRender =
            BranchReview.filterFileReviews
                { filterForUser =
                    if displayOnlyUsersTags then
                        Just username

                    else
                        Nothing
                , filterApprovedTags = displayOnlyTagsNeedingApproval
                }
                branchReview.fileReviews

        totalReviews =
            BranchReview.countTotalReviewsAndTags branchReview.fileReviews

        displayingReviews =
            BranchReview.countTotalReviewsAndTags fileReviewsToRender
    in
    renderBranchReviewHeader
        displayOnlyUsersTags
        displayOnlyTagsNeedingApproval
        displayingReviews
        totalReviews
        branchReview
        :: List.map (renderFileReview username branchReview.requiredConfirmations) fileReviewsToRender


renderBranchReviewHeader : Bool -> Bool -> Int -> Int -> BranchReview.BranchReview -> Html.Html Msg
renderBranchReviewHeader displayOnlyUsersTags displayOnlyTagsNeedingApproval displayingReviews totalReviews branchReview =
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
                        [ class "has-text-black-ter is-size-3"
                        , style "padding-right" "15px"
                        ]
                        [ text "Filter Options" ]
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


renderFileReview : String -> Set.Set String -> BranchReview.FileReview -> Html.Html Msg
renderFileReview username requiredConfirmations fileReview =
    div [ class "section" ] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            BranchReview.NewFileReview tags ->
                renderTags
                    username
                    "This tag has been added to a new file"
                    requiredConfirmations
                    CM.GreenBackground
                    tags

            BranchReview.DeletedFileReview tags ->
                renderTags
                    username
                    "This tag is being removed inside a deleted file"
                    requiredConfirmations
                    CM.RedBackground
                    tags

            BranchReview.ModifiedFileReview reviews ->
                renderReviews
                    username
                    requiredConfirmations
                    reviews

            BranchReview.RenamedFileReview _ reviews ->
                renderReviews
                    username
                    requiredConfirmations
                    reviews
        ]


renderFileReviewHeader : BranchReview.FileReview -> Html.Html Msg
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
                    BranchReview.NewFileReview _ ->
                        "new file"

                    BranchReview.ModifiedFileReview _ ->
                        "modified file"

                    BranchReview.DeletedFileReview _ ->
                        "deleted file"

                    BranchReview.RenamedFileReview _ _ ->
                        "renamed file"
            ]
        ]


renderTags : String -> String -> Set.Set String -> CM.RenderStyle -> List BranchReview.Tag -> Html.Html Msg
renderTags username description requiredConfirmations renderStyle tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview
                { renderStyle = renderStyle
                , username = username
                , description = description
                , requiredConfirmations = requiredConfirmations
                }
            )
            tags


renderReviews : String -> Set.Set String -> List BranchReview.Review -> Html.Html Msg
renderReviews username requiredConfirmations reviews =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (\review ->
                renderTagOrReview
                    { renderStyle =
                        case review.reviewType of
                            BranchReview.ReviewNewTag ->
                                CM.PlainBackground

                            BranchReview.ReviewDeletedTag ->
                                CM.PlainBackground

                            BranchReview.ReviewModifiedTag showAlteredLines alteredLines ->
                                CM.MixedBackground { showAlteredLines = showAlteredLines, alteredLines = alteredLines }
                    , username = username
                    , description =
                        case review.reviewType of
                            BranchReview.ReviewNewTag ->
                                "This tag has been added to an existing file"

                            BranchReview.ReviewDeletedTag ->
                                "This tag has been deleted from an existing file"

                            BranchReview.ReviewModifiedTag _ _ ->
                                "This tag has been modified"
                    , requiredConfirmations = requiredConfirmations
                    }
                    review.tag
            )
            reviews


renderTagOrReview :
    { renderStyle : CM.RenderStyle
    , username : String
    , description : String
    , requiredConfirmations : Set.Set String
    }
    -> BranchReview.Tag
    -> Html.Html Msg
renderTagOrReview { renderStyle, username, description, requiredConfirmations } tag =
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
                                        [ text <| BranchReview.readableTagType tag.tagType ]
                                    , case tag.approvedState of
                                        BranchReview.Approved ->
                                            div
                                                [ class "level-right has-text-success" ]
                                                [ text "Approved" ]

                                        BranchReview.NotApproved ->
                                            div
                                                [ class "level-right has-text-danger" ]
                                                [ text "Requires Approval" ]

                                        BranchReview.Requesting ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "loading..." ]

                                        BranchReview.RequestFailed err ->
                                            div [ class "is-hidden" ] []
                                    ]
                                ]
                            , dt [] [ text <| "Owner: " ++ tag.owner ]
                            ]
                        , p [] [ text description ]
                        ]
                    , div
                        [ class "buttons" ]
                        [ case renderStyle of
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
                        , if username /= tag.owner || (not <| Set.member username requiredConfirmations) then
                            div [ class "is-hidden" ] []

                          else
                            case tag.approvedState of
                                BranchReview.Approved ->
                                    button
                                        [ class "button is-warning is-fullwidth has-text-white"
                                        , onClick <| RejectTags <| Set.singleton tag.tagId
                                        ]
                                        [ text "Reject" ]

                                BranchReview.NotApproved ->
                                    button
                                        [ class "button is-success is-fullwidth"
                                        , onClick <| ApproveTags <| Set.singleton tag.tagId
                                        ]
                                        [ text "Approve" ]

                                BranchReview.Requesting ->
                                    button
                                        [ class "button is-success is-fullwidth is-loading" ]
                                        []

                                -- TOD handle error better?
                                BranchReview.RequestFailed err ->
                                    button
                                        [ class "button is-danger is-fullwidth"
                                        , disabled True
                                        ]
                                        [ text "Internal Error" ]
                        ]
                    ]
                ]
            ]
        ]



-- UPDATE


type Msg
    = CompletedGetBranchReview (Result.Result (Core.HttpError ()) Api.GetBranchReviewResponse)
    | SetDisplayOnlyUsersTags Bool
    | SetDisplayOnlyTagsNeedingApproval Bool
    | SetShowAlteredLines String Bool
    | ApproveTags (Set.Set String)
    | CompletedApproveTags (Set.Set String) (Result.Result (Core.HttpError ()) ())
    | RejectTags (Set.Set String)
    | CompletedRejectTags (Set.Set String) (Result.Result (Core.HttpError ()) ())


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetBranchReview (Result.Ok (Api.GetBranchReviewResponse branchReview user repos)) ->
            ( { model | branchReview = RemoteData.Success branchReview }, Cmd.none )

        -- TODO handle error
        CompletedGetBranchReview (Result.Err err) ->
            ( { model | branchReview = RemoteData.Failure () }, Cmd.none )

        SetDisplayOnlyUsersTags displayOnlyUsersTags ->
            ( { model | displayOnlyUsersTags = displayOnlyUsersTags }, Cmd.none )

        SetDisplayOnlyTagsNeedingApproval displayOnlyTagsNeedingApproval ->
            ( { model | displayOnlyTagsNeedingApproval = displayOnlyTagsNeedingApproval }, Cmd.none )

        SetShowAlteredLines tagId showAlteredLines ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateReviews
                            (\review ->
                                if review.tag.tagId == tagId then
                                    { review
                                        | reviewType =
                                            case review.reviewType of
                                                BranchReview.ReviewModifiedTag _ alteredLines ->
                                                    BranchReview.ReviewModifiedTag showAlteredLines alteredLines

                                                BranchReview.ReviewNewTag ->
                                                    BranchReview.ReviewNewTag

                                                BranchReview.ReviewDeletedTag ->
                                                    BranchReview.ReviewDeletedTag
                                    }

                                else
                                    review
                            )
                        )
                        model.branchReview
              }
            , Cmd.none
            )

        ApproveTags tags ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = BranchReview.Requesting }

                                else
                                    tag
                            )
                        )
                        model.branchReview
              }
            , Api.postApproveTags model.repoId model.branchName model.commitId tags (CompletedApproveTags tags)
            )

        -- TODO Probably better to feed branchReview throguh to avoid `RemoteData.map`
        CompletedApproveTags approvedTags (Ok ()) ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId approvedTags then
                                    { tag | approvedState = BranchReview.Approved }

                                else
                                    tag
                            )
                        )
                        model.branchReview
              }
            , Cmd.none
            )

        -- TODO Handle error
        CompletedApproveTags attemptedApprovedTags _ ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId attemptedApprovedTags then
                                    { tag | approvedState = BranchReview.RequestFailed () }

                                else
                                    tag
                            )
                        )
                        model.branchReview
              }
            , Cmd.none
            )

        RejectTags tags ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = BranchReview.Requesting }

                                else
                                    tag
                            )
                        )
                        model.branchReview
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
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = BranchReview.NotApproved }

                                else
                                    tag
                            )
                        )
                        model.branchReview
              }
            , Cmd.none
            )

        -- TODO handle errors
        CompletedRejectTags attemptedRejectTags _ ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId attemptedRejectTags then
                                    { tag | approvedState = BranchReview.RequestFailed () }

                                else
                                    tag
                            )
                        )
                        model.branchReview
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
