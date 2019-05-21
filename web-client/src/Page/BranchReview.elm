module Page.BranchReview exposing (Model, Msg, init, subscriptions, toSession, update, view)

import Api.Api as Api
import Api.Core as Core
import BranchReview
import Html exposing (Html, div, text)
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
                        renderBranchReview branchReview
    }


renderBranchReview : BranchReview.BranchReview -> Html.Html Msg
renderBranchReview branchReview =
    div [] <|
        renderBranchReviewHeader branchReview
            :: List.map renderFileReview branchReview.fileReviews


renderBranchReviewHeader : BranchReview.BranchReview -> Html.Html Msg
renderBranchReviewHeader branchReview =
    div [] [ text "navbar" ]


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


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        CompletedGetBranchReview (Result.Ok (Api.GetBranchReviewResponse branchReview user repos)) ->
            ( { model | branchReview = RemoteData.Success branchReview }, Cmd.none )

        -- TODO handle error
        CompletedGetBranchReview (Result.Err err) ->
            ( { model | branchReview = RemoteData.Failure () }, Cmd.none )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- EXPORT


toSession : Model -> Session
toSession =
    .session
