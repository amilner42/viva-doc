module Icon exposing (IconSize(..), RenderIconConfig, renderIcon)

{-| Helper for working with icons. This relies on Bulma for css.
-}

import Bulma
import Html exposing (Attribute, Html, div, i, span, text)
import Html.Attributes exposing (class, style)


type alias RenderIconConfig =
    { iconName : String
    , optionalAdjacentText : Maybe ( String, Bulma.BulmaColor )
    , iconSize : Bulma.BulmaSize
    , iconColor : Bulma.BulmaColor
    }


type IconSize
    = SmallIcon
    | MediumIcon
    | LargeIcon


renderIcon : RenderIconConfig -> Html msg
renderIcon { iconName, optionalAdjacentText, iconSize, iconColor } =
    let
        icon =
            span
                [ class "icon is-small" ]
                [ i
                    [ Bulma.withBulmaClasses
                        [ Bulma.BulmaSize iconSize
                        , Bulma.TextColor iconColor
                        ]
                        "material-icons "
                    ]
                    [ text iconName ]
                ]
    in
    case optionalAdjacentText of
        Nothing ->
            icon

        Just ( adjacentText, textColor ) ->
            div
                [ class "level", style "margin" "0" ]
                [ div
                    [ class "level-left" ]
                    [ icon
                    , span
                        [ Bulma.withBulmaClasses
                            [ Bulma.TextColor textColor ]
                            ""
                        , style "margin-left" "10px"
                        ]
                        [ text adjacentText ]
                    ]
                ]
