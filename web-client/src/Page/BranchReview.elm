module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import BranchReview
import Html exposing (Html, button, div, i, text)
import Html.Attributes exposing (class)
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
        case model.session of
            Session.Guest _ ->
                div [] [ text "You need to be logged in to view this page..." ]

            Session.LoggedIn _ viewer ->
                case model.branchReview of
                    RemoteData.NotAsked ->
                        div [] [ text "Logged in... " ]

                    RemoteData.Loading ->
                        div [] [ text "Loading review..." ]

                    RemoteData.Failure _ ->
                        div [] [ text "Uh oh" ]

                    RemoteData.Success branchReview ->
                        renderBranchReview
                            (Viewer.getUsername viewer)
                            model.displayOnlyUsersTags
                            model.displayOnlyTagsNeedingApproval
                            branchReview
    }


renderBranchReview : String -> Bool -> Bool -> BranchReview.BranchReview -> Html.Html Msg
renderBranchReview username displayOnlyUsersTags displayOnlyTagsNeedingApproval branchReview =
    div [] <|
        renderBranchReviewHeader displayOnlyUsersTags displayOnlyTagsNeedingApproval branchReview
            :: (List.map renderFileReview <|
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
        []
        [ button
            [ onClick <| SetDisplayOnlyUsersTags (not displayOnlyUsersTags) ]
            [ i
                [ class "material-icons" ]
                [ text <|
                    if displayOnlyUsersTags then
                        "check_box"

                    else
                        "check_box_outline_blank"
                ]
            , text "Display only your tags"
            ]
        , button
            [ onClick <| SetDisplayOnlyTagsNeedingApproval (not displayOnlyTagsNeedingApproval) ]
            [ i
                [ class "material-icons" ]
                [ text <|
                    if displayOnlyTagsNeedingApproval then
                        "check_box"

                    else
                        "check_box_outline_blank"
                ]
            , text "Display only tags that require approval"
            ]
        ]


renderFileReview : BranchReview.FileReview -> Html.Html Msg
renderFileReview fileReview =
    div [] <|
        [ renderFileReviewHeader fileReview
        , case fileReview.fileReviewType of
            BranchReview.NewFileReview tags ->
                renderTags tags

            BranchReview.DeletedFileReview tags ->
                renderTags tags

            BranchReview.ModifiedFileReview reviews ->
                renderReviews reviews

            BranchReview.RenamedFileReview _ reviews ->
                renderReviews reviews
        ]


renderFileReviewHeader : BranchReview.FileReview -> Html.Html Msg
renderFileReviewHeader fileReview =
    div [] [ text fileReview.currentFilePath ]


renderTags : List BranchReview.Tag -> Html.Html Msg
renderTags tags =
    div [] <| List.map renderTag tags


renderReviews : List BranchReview.Review -> Html.Html Msg
renderReviews reviews =
    div [] <| List.map renderReview reviews


renderTag : BranchReview.Tag -> Html.Html Msg
renderTag theTag =
    Markdown.toHtml [] <| contentToMarkdownCode theTag.content


renderReview : BranchReview.Review -> Html.Html Msg
renderReview review =
    Markdown.toHtml [] <| contentToMarkdownCode review.tag.content


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
