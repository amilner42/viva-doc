module Page exposing (DisplayHeroOption(..), HighlightableTab(..), viewWithHeader)

{-| This allows you to insert a page under a common header. The header is usually a navbar but not always.
-}

import Asset
import Browser exposing (Document)
import Github
import Html exposing (Html, a, button, div, h1, i, img, li, nav, p, section, span, strong, text, ul)
import Html.Attributes exposing (class, classList, href, style)
import Html.Events exposing (onClick)
import Route exposing (Route)
import Session exposing (Session)
import Viewer exposing (Viewer)


type DisplayHeroOption msg
    = NoHero
    | LandingHero msg


type alias RenderHeaderConfig msg =
    { showHero : DisplayHeroOption msg
    , renderNavbarConfig : RenderNavbarConfig msg
    }


{-| Frame a page under a header.
-}
viewWithHeader :
    RenderHeaderConfig msg
    -> Maybe Viewer
    -> { title : String, content : Html pageMsg }
    -> (pageMsg -> msg)
    -> Document msg
viewWithHeader { showHero, renderNavbarConfig } maybeViewer { title, content } toMsg =
    { title = title
    , body =
        [ case showHero of
            NoHero ->
                renderNavbar renderNavbarConfig maybeViewer

            LandingHero scrollMsg ->
                renderLandingHero scrollMsg <| renderNavbar renderNavbarConfig maybeViewer
        , Html.map toMsg content
        ]
    }


type HighlightableTab
    = NoTab
    | HomeTab
    | DocumentationTab


type alias RenderNavbarConfig msg =
    { mobileNavbarOpen : Bool
    , toggleMobileNavbar : msg
    , logout : msg
    , loginWithGithub : msg
    , isLoggingIn : Bool
    , isLoggingOut : Bool
    , showHomeButton : Bool
    , selectedTab : HighlightableTab
    }


renderLandingHero : msg -> Html msg -> Html msg
renderLandingHero scrollMsg navbar =
    section
        [ class "hero is-fullheight is-primary is-bold" ]
        [ navbar
        , div
            [ class "hero-body" ]
            [ div
                [ class "container has-text-centered" ]
                [ img
                    [ Asset.src Asset.vdTitle
                    , style "width" "400px"
                    , style "height" "100px"
                    ]
                    []
                , p
                    [ class "subtitle is-4 has-text-vd-base-light" ]
                    [ text "Documentation that lives" ]
                ]
            ]
        , div
            [ class "hero-foot" ]
            [ div
                [ class "has-text-centered" ]
                [ button
                    [ class "button is-primary"
                    , onClick scrollMsg
                    ]
                    [ text "more" ]
                ]
            , p
                [ class "content is-small has-text-right"
                , style "margin" "0 10px 10px 0"
                ]
                [ text "Alpha Version 1" ]
            ]
        ]


{-| Render the navbar.

Will have log-in/sign-up or logout buttons according to whether there is a `Viewer`.

-}
renderNavbar : RenderNavbarConfig msg -> Maybe Viewer -> Html msg
renderNavbar config maybeViewer =
    nav [ class "navbar is-primary" ]
        [ div
            [ class "navbar-brand" ]
            [ div
                [ class "navbar-item"
                , style "padding" "5px"
                , style "width" "50px"
                , style "margin-left" "3px"
                ]
                [ img
                    [ style "height" "45px !important"
                    , style "max-height" "45px"
                    , Asset.src Asset.vdLogo
                    ]
                    []
                ]
            , div
                [ classList
                    [ ( "navbar-burger burger has-text-vd-spark-bright", True )
                    , ( "is-active", config.mobileNavbarOpen )
                    ]
                , onClick config.toggleMobileNavbar
                ]
                [ span [] [], span [] [], span [] [] ]
            ]
        , div
            [ classList
                [ ( "navbar-menu", True )
                , ( "is-active", config.mobileNavbarOpen )
                ]
            ]
            [ div
                [ classList
                    [ ( "navbar-start", True )
                    , ( "is-hidden", not config.showHomeButton )
                    ]
                ]
                [ a
                    [ classList
                        [ ( "navbar-item", True )
                        , ( "is-border-bottom-underlined"
                          , case config.selectedTab of
                                HomeTab ->
                                    True

                                _ ->
                                    False
                          )
                        ]
                    , Route.href Route.Home
                    ]
                    [ text "Home" ]
                ]
            , div
                [ class "navbar-end" ]
                [ a
                    [ classList
                        [ ( "navbar-item", True )
                        , ( "is-border-bottom-underlined"
                          , case config.selectedTab of
                                DocumentationTab ->
                                    True

                                _ ->
                                    False
                          )
                        ]
                    , Route.href <| Route.Documentation Route.OverviewTab
                    ]
                    [ text "Docs" ]
                , div [ class "navbar-item" ]
                    (case maybeViewer of
                        Nothing ->
                            [ button
                                [ classList
                                    [ ( "button is-vd-box-link is-medium", True )
                                    , ( "is-loading", config.isLoggingIn )
                                    ]
                                , onClick config.loginWithGithub
                                ]
                                [ text "Sign in with github" ]
                            ]

                        Just viewer ->
                            [ button
                                [ classList
                                    [ ( "button is-vd-box-link is-medium", True )
                                    , ( "is-loading", config.isLoggingOut )
                                    ]
                                , onClick config.logout
                                ]
                                [ text "Log out" ]
                            ]
                    )
                ]
            ]
        ]
