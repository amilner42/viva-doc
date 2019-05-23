module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import BranchReview
import Html exposing (Html, button, div, dl, dt, i, p, span, text)
import Html.Attributes exposing (class, classList, disabled, style)
import Html.Events exposing (onClick)
import Markdown
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
    renderBranchReviewHeader displayOnlyUsersTags displayOnlyTagsNeedingApproval branchReview
        :: (List.map (renderFileReview username) <|
                BranchReview.filterFileReviews
                    { filterForUser =
                        if displayOnlyUsersTags then
                            Just username

                        else
                            Nothing
                    , filterApprovedTags = displayOnlyTagsNeedingApproval
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


renderFileReview : String -> BranchReview.FileReview -> Html.Html Msg
renderFileReview username fileReview =
    div [ class "section" ] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            BranchReview.NewFileReview tags ->
                renderTags username tags

            BranchReview.DeletedFileReview tags ->
                renderTags username tags

            BranchReview.ModifiedFileReview reviews ->
                renderReviews username reviews

            BranchReview.RenamedFileReview _ reviews ->
                renderReviews username reviews
        ]


renderFileReviewHeader : BranchReview.FileReview -> Html.Html Msg
renderFileReviewHeader fileReview =
    div [ class "title is-4 has-text-black-bis" ] [ text fileReview.currentFilePath ]


renderTags : String -> List BranchReview.Tag -> Html.Html Msg
renderTags username tags =
    div [ class "tile is-ancestor is-vertical" ] <|
        List.map
            (renderTagOrReview { alteredLines = Nothing, username = username })
            tags


renderReviews : String -> List BranchReview.Review -> Html.Html Msg
renderReviews username reviews =
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
                    }
                    review.tag
            )
            reviews


renderTagOrReview :
    { alteredLines : Maybe (List BranchReview.AlteredLine)
    , username : String
    }
    -> BranchReview.Tag
    -> Html.Html Msg
renderTagOrReview { alteredLines, username } tag =
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
                                    , case tag.approvedState of
                                        BranchReview.Approved ->
                                            div
                                                [ class "level-right has-text-success" ]
                                                [ text "Approved" ]

                                        BranchReview.NotApproved ->
                                            div
                                                [ class "level-right has-text-danger" ]
                                                [ text "Requires Approval" ]

                                        BranchReview.RequestingApproval ->
                                            div
                                                [ class "level-right has-text-grey-light" ]
                                                [ text "loading..." ]

                                        BranchReview.RequestFailed err ->
                                            div [ class "is-hidden" ] []
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
                        , if username /= tag.owner then
                            div [ class "is-hidden" ] []

                          else
                            case tag.approvedState of
                                BranchReview.Approved ->
                                    div [ class "is-hidden" ] []

                                BranchReview.NotApproved ->
                                    button
                                        [ class "button is-success is-fullwidth"
                                        , onClick <| ApproveTags <| Set.fromList [ tag.tagId ]
                                        ]
                                        [ text "Approve" ]

                                BranchReview.RequestingApproval ->
                                    button
                                        [ class "button is-success is-fullwidth is-loading" ]
                                        []

                                -- TOD handle error better?
                                BranchReview.RequestFailed err ->
                                    button
                                        [ class "button is-success is-fullwidth"
                                        , disabled True
                                        ]
                                        [ text "Internal Error" ]
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
    | ApproveTags (Set.Set String)
    | CompletedApproveTags (Set.Set String) (Result.Result (Core.HttpError ()) ())


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

        ApproveTags tags ->
            ( { model
                | branchReview =
                    RemoteData.map
                        (BranchReview.updateTags
                            (\tag ->
                                if Set.member tag.tagId tags then
                                    { tag | approvedState = BranchReview.RequestingApproval }

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



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
