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


type DisplayHeroOption
    = NoHero
    | LandingHero


type alias RenderHeaderConfig msg =
    { showHero : DisplayHeroOption
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

            LandingHero ->
                renderLandingHero <| renderNavbar renderNavbarConfig maybeViewer
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


renderLandingHero : Html msg -> Html msg
renderLandingHero navbar =
    section
        [ class "hero is-medium is-primary is-bold" ]
        [ navbar
        , div
            [ class "hero-body" ]
            [ div
                [ class "container has-text-centered" ]
                [ h1
                    [ class "title is-1 is-vd-hero-title" ]
                    [ text "VivaDoc" ]
                , p
                    [ class "subtitle is-4 has-text-vd-base-light" ]
                    [ text "Documentation that lives" ]
                ]
            ]
        , div
            [ class "hero-foot" ]
            [ p
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
                [ class "navbar-item" ]
                [ img [ Asset.src Asset.githubLogo ] [] ]
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
                    , Route.href <| Route.Documentation
                    ]
                    [ text "Getting Started" ]
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
