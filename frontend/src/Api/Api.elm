module Api.Api exposing (GithubLoginBody, getLogout, getUser, githubLoginFromCode)

{-| This module strictly contains the routes to the API and their respective errors.

NOTE: Extra things that are unrelated to the API requests and handling their errors should most
likely be put in `Api.Core`.

-}

import Api.Core as Core
import Api.Endpoint as Endpoint
import Http
import Json.Decode as Decode
import Json.Decode.Pipeline exposing (optional)
import Json.Encode as Encode
import Viewer


type alias GithubLoginBody =
    { code : String }


{-| TODO handle errors
-}
githubLoginFromCode : GithubLoginBody -> (Result.Result (Core.HttpError ()) Viewer.Viewer -> msg) -> Cmd.Cmd msg
githubLoginFromCode { code } handleResult =
    Core.get
        (Endpoint.githubLoginFromCode code)
        (Just (seconds 20))
        Nothing
        (Core.expectJsonWithUserAndRepos handleResult Viewer.decodeViewer (Decode.succeed ()))


{-| TODO handle errors.
-}
getUser : (Result.Result (Core.HttpError ()) Viewer.Viewer -> msg) -> Cmd.Cmd msg
getUser handleResult =
    Core.get
        Endpoint.user
        (Just (seconds 10))
        Nothing
        (Core.expectJsonWithUserAndRepos handleResult Viewer.decodeViewer (Decode.succeed ()))


{-| TODO care about the results beyond success/error (aka unit types).
-}
getLogout : (Result.Result (Core.HttpError ()) () -> msg) -> Cmd.Cmd msg
getLogout handleResult =
    Core.get
        Endpoint.logout
        (Just (seconds 10))
        Nothing
        (Core.expectJson handleResult (Decode.succeed ()) (Decode.succeed ()))



-- INTERNAL HELPERS


{-| Convert seconds to milliseconds.
-}
seconds : Float -> Float
seconds =
    (*) 1000


{-| Decode a single string error into a list with 1 string error.
-}
decodeFieldError : Decode.Decoder (List String)
decodeFieldError =
    Decode.string
        |> Decode.map (\err -> [ err ])


{-| Decode a list of string errors.
-}
decodeFieldErrors : Decode.Decoder (List String)
decodeFieldErrors =
    Decode.list Decode.string