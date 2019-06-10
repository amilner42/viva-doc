module Api.Api exposing (GithubLoginBody, deleteApprovedTag, deleteRejectedTag, getCommitReview, getLogout, getUser, githubLoginFromCode, postApproveDocs, postApproveTags, postRejectTags)

{-| This module strictly contains the routes to the API and their respective errors.

NOTE: Extra things that are unrelated to the API requests and handling their errors should most
likely be put in `Api.Core`.

-}

import Api.Core as Core
import Api.Endpoint as Endpoint
import Api.Errors.CommitReviewAction as CraError
import Api.Errors.GetCommitReview as GcrError
import CommitReview
import Http
import Json.Decode as Decode
import Json.Decode.Pipeline exposing (optional)
import Json.Encode as Encode
import Set
import Viewer


type alias GithubLoginBody =
    { code : String }


standardTimeout =
    Just (seconds 10)


longTimeout =
    Just (seconds 10)


{-| TODO handle errors
-}
githubLoginFromCode : GithubLoginBody -> (Result.Result (Core.HttpError ()) Viewer.Viewer -> msg) -> Cmd.Cmd msg
githubLoginFromCode { code } handleResult =
    Core.get
        (Endpoint.githubLoginFromCode code)
        standardTimeout
        Nothing
        (Core.expectJsonWithUserAndRepos handleResult Viewer.decodeViewer (Decode.succeed ()))


{-| TODO handle errors.
-}
getUser : (Result.Result (Core.HttpError ()) Viewer.Viewer -> msg) -> Cmd.Cmd msg
getUser handleResult =
    Core.get
        Endpoint.user
        standardTimeout
        Nothing
        (Core.expectJsonWithUserAndRepos handleResult Viewer.decodeViewer (Decode.succeed ()))


{-| TODO handle errors.
-}
getCommitReview :
    Int
    -> Int
    -> String
    -> (Result.Result (Core.HttpError GcrError.GetCommitReviewError) CommitReview.CommitReview -> msg)
    -> Cmd.Cmd msg
getCommitReview repoId prNumber commitId handleResult =
    Core.get
        (Endpoint.commitReview repoId prNumber commitId)
        standardTimeout
        Nothing
        (Core.expectJson handleResult CommitReview.decodeCommitReview GcrError.decodeGetCommitReviewError)


{-| TODO handle errors.
-}
postApproveTags :
    Int
    -> Int
    -> String
    -> Set.Set String
    -> (Result.Result (Core.HttpError CraError.CommitReviewActionError) () -> msg)
    -> Cmd.Cmd msg
postApproveTags repoId prNumber commitId tags handleResult =
    let
        encodedTags =
            Encode.object [ ( "approveTags", Encode.set Encode.string tags ) ]
    in
    Core.post
        (Endpoint.commitReviewApproveTags repoId prNumber commitId)
        standardTimeout
        Nothing
        (Http.jsonBody encodedTags)
        (Core.expectJson handleResult (Decode.succeed ()) CraError.decodeCommitReviewActionError)


{-| TODO handle errors.
-}
deleteApprovedTag :
    Int
    -> Int
    -> String
    -> String
    -> (Result.Result (Core.HttpError CraError.CommitReviewActionError) () -> msg)
    -> Cmd.Cmd msg
deleteApprovedTag repoId prNumber commitId tagId handleResult =
    Core.delete
        (Endpoint.commitReviewApproveTag repoId prNumber commitId tagId)
        standardTimeout
        Nothing
        Http.emptyBody
        (Core.expectJson handleResult (Decode.succeed ()) CraError.decodeCommitReviewActionError)


{-| TODO handle errors.
-}
postRejectTags :
    Int
    -> Int
    -> String
    -> Set.Set String
    -> (Result.Result (Core.HttpError CraError.CommitReviewActionError) () -> msg)
    -> Cmd.Cmd msg
postRejectTags repoId prNumber commitId tags handleResult =
    let
        encodedTags =
            Encode.object [ ( "rejectTags", Encode.set Encode.string tags ) ]
    in
    Core.post
        (Endpoint.commitReviewRejectTags repoId prNumber commitId)
        standardTimeout
        Nothing
        (Http.jsonBody encodedTags)
        (Core.expectJson handleResult (Decode.succeed ()) CraError.decodeCommitReviewActionError)


{-| TODO handle errors.
-}
deleteRejectedTag :
    Int
    -> Int
    -> String
    -> String
    -> (Result.Result (Core.HttpError CraError.CommitReviewActionError) () -> msg)
    -> Cmd.Cmd msg
deleteRejectedTag repoId prNumber commitId tagId handleResult =
    Core.delete
        (Endpoint.commitReviewRejectTag repoId prNumber commitId tagId)
        standardTimeout
        Nothing
        Http.emptyBody
        (Core.expectJson handleResult (Decode.succeed ()) CraError.decodeCommitReviewActionError)


postApproveDocs :
    Int
    -> Int
    -> String
    -> (Result.Result (Core.HttpError CraError.CommitReviewActionError) () -> msg)
    -> Cmd.Cmd msg
postApproveDocs repoId prNumber commitId handleResult =
    Core.post
        (Endpoint.commitReviewApproveDocs repoId prNumber commitId)
        standardTimeout
        Nothing
        Http.emptyBody
        (Core.expectJson handleResult (Decode.succeed ()) CraError.decodeCommitReviewActionError)


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
