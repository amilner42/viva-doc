module Api.Errors.CommitReviewAction exposing (CommitReviewActionError(..), decodeCommitReviewActionError)

import Json.Decode as Decode


type CommitReviewActionError
    = UnknownError
    | StaleCommitError String


decodeCommitReviewActionError : Decode.Decoder CommitReviewActionError
decodeCommitReviewActionError =
    Decode.oneOf
        [ decodeCommitStaleError |> Decode.map StaleCommitError
        , Decode.succeed UnknownError
        ]


decodeCommitStaleError : Decode.Decoder String
decodeCommitStaleError =
    Decode.field "errorCode" Decode.int
        |> Decode.andThen
            (\errorCode ->
                if errorCode == 10 then
                    Decode.field "newHeadCommitId" Decode.string

                else
                    Decode.fail "wrong error code"
            )
