module Page.Pricing exposing (Model, Msg(..), init, update, view)

import Html exposing (div, h1, p, text)
import Html.Attributes exposing (class, style)
import Session


type alias Model =
    { session : Session.Session }


type Msg
    = NoOp


init : Session.Session -> ( Model, Cmd.Cmd Msg )
init session =
    ( { session = session }, Cmd.none )


view : Model -> { title : String, content : Html.Html Msg }
view model =
    { title = "Pricing", content = pricingView }


pricingView : Html.Html Msg
pricingView =
    div
        []
        [ div
            [ class "section has-text-centered" ]
            [ h1
                [ class "title is-2" ]
                [ text "Alpha Version Pricing" ]
            , div
                [ class "columns is-centered" ]
                [ div
                    [ class "column is-two-thirds" ]
                    [ div
                        [ class "content" ]
                        [ p [] [ text alphaPricingParagraph1 ]
                        , p [] [ text alphaPricingParagraph2 ]
                        , p [] [ text alphaPricingParagraph3 ]
                        , p [] [ text alphaPricingParagraph4 ]
                        ]
                    ]
                ]
            ]
        ]


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )


alphaPricingParagraph1 : String
alphaPricingParagraph1 =
    "Free. Yup, you read that right."


alphaPricingParagraph2 : String
alphaPricingParagraph2 =
    """VivaDoc is young and values early adopters immensly. Adventurous users willing to try VivaDoc before it is
    mainstream will be given surprise rewards upon our official release!"""


alphaPricingParagraph3 : String
alphaPricingParagraph3 =
    """Additionally, VivaDoc will always be free for open source projects of every size! We absolutely
    love open source and want to give back by improving the entire community's documentation."""


alphaPricingParagraph4 : String
alphaPricingParagraph4 =
    """ Join the documentation revolution today."""
