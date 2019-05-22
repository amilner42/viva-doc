module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import BranchReview
import Html exposing (Html, button, div, dl, dt, i, p, span, text)
import Html.Attributes exposing (class, classList, style)
import Html.Events exposing (onClick)
import Markdown
import RemoteData
import Session exposing (Session)
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
                                (Viewer.getUsername viewer)
                                model.displayOnlyUsersTags
                                model.displayOnlyTagsNeedingApproval
                                branchReview
    }


renderBranchReview : String -> Bool -> Bool -> BranchReview.BranchReview -> List (Html.Html Msg)
renderBranchReview username displayOnlyUsersTags displayOnlyTagsNeedingApproval branchReview =
    renderBranchReviewHeader displayOnlyUsersTags displayOnlyTagsNeedingApproval branchReview
        :: (List.map (renderFileReview username branchReview.approvedTags) <|
                BranchReview.filterFileReviews
                    { filterForUser =
                        if displayOnlyUsersTags then
                            Just username

                        else
                            Nothing
                    , filterApprovedTags =
                        if displayOnlyTagsNeedingApproval then
                            Just branchReview.approvedTags

                        else
                            Nothing
                    }
                    branchReview.fileReviews
           )


renderBranchReviewHeader : Bool -> Bool -> BranchReview.BranchReview -> Html.Html Msg
renderBranchReviewHeader displayOnlyUsersTags displayOnlyTagsNeedingApproval branchReview =
    div
        [ class "level is-mobile"
        , style "margin-bottom" "0px"
        ]
        [ div
            [ class "level-left" ]
            [ div [ class "level-item title is-4" ] [ text "Filter Options" ] ]
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


renderFileReview : String -> List String -> BranchReview.FileReview -> Html.Html Msg
renderFileReview username approvedTags fileReview =
    div [ class "section" ] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            BranchReview.NewFileReview tags ->
                renderTags username approvedTags tags

            BranchReview.DeletedFileReview tags ->
                renderTags username approvedTags tags

            BranchReview.ModifiedFileReview reviews ->
                renderReviews username approvedTags reviews

            BranchReview.RenamedFileReview _ reviews ->
                renderReviews username approvedTags reviews
        ]


renderFileReviewHeader : BranchReview.FileReview -> Html.Html Msg
renderFileReviewHeader fileReview =
    div [ class "title is-4 has-text-black-bis" ] [ text fileReview.currentFilePath ]


renderTags : String -> List String -> List BranchReview.Tag -> Html.Html Msg
renderTags username approvedTags tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview
                { alteredLines = Nothing
                , username = username
                , approvedTags = approvedTags
                }
            )
            tags


renderReviews : String -> List String -> List BranchReview.Review -> Html.Html Msg
renderReviews username approvedTags reviews =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (\review ->
                renderTagOrReview
                    { alteredLines =
                        case review.reviewType of
                            BranchReview.ReviewNewTag ->
                                Nothing

                            BranchReview.ReviewDeletedTag ->
                                Nothing

                            BranchReview.ReviewModifiedTag alteredLines ->
                                Just alteredLines
                    , username = username
                    , approvedTags = approvedTags
                    }
                    review.tag
            )
            reviews


renderTagOrReview :
    { alteredLines : Maybe (List BranchReview.AlteredLine)
    , username : String
    , approvedTags : List String
    }
    -> BranchReview.Tag
    -> Html.Html Msg
renderTagOrReview { alteredLines, username, approvedTags } tag =
    let
        isTagApproved =
            List.member tag.tagId approvedTags
    in
    div [ class "tile is-parent" ]
        [ Markdown.toHtml
            [ class "tile is-8 is-child" ]
            (contentToMarkdownCode tag.content)
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
                                        [ text <| "Owner: " ++ username ]
                                    , div
                                        [ classList
                                            [ ( "level-right", True )
                                            , ( "has-text-danger", not isTagApproved )
                                            , ( "has-text-success", isTagApproved )
                                            ]
                                        ]
                                        [ text <|
                                            if isTagApproved then
                                                "Approved"

                                            else
                                                "Requires Approval"
                                        ]
                                    ]
                                ]
                            , dt [] [ text <| "Tag type: " ++ BranchReview.readableTagType tag.tagType ]
                            ]
                        ]
                    , div
                        [ class "buttons" ]
                        [ button
                            [ classList
                                [ ( "button is-info is-fullwidth", True )
                                , ( "is-hidden"
                                  , case alteredLines of
                                        Nothing ->
                                            True

                                        Just _ ->
                                            False
                                  )
                                ]
                            ]
                            [ text "Show Diff" ]
                        , button
                            [ classList
                                [ ( "button is-success is-fullwidth", True )
                                , ( "is-hidden", username /= tag.owner || isTagApproved )
                                ]
                            ]
                            [ text "Approve" ]
                        ]
                    ]
                ]
            ]
        ]


contentToMarkdownCode : List String -> String
contentToMarkdownCode content =
    "```javascript\n" ++ String.join "\n" content ++ "\n```"



-- UPDATE


type Msg
    = CompletedGetBranchReview (Result.Result (Core.HttpError ()) Api.GetBranchReviewResponse)
    | SetDisplayOnlyUsersTags Bool
    | SetDisplayOnlyTagsNeedingApproval Bool


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



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
