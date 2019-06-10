module Api.Errors.GetCommitReview exposing (GetCommitReviewError(..), decodeGetCommitReviewError)

import Json.Decode as Decode


type GetCommitReviewError
    = UnknownError
    | CommitAnalysisPending


decodeGetCommitReviewError : Decode.Decoder GetCommitReviewError
decodeGetCommitReviewError =
    Decode.oneOf
        [ decodeCommitAnalysisPendingError
        , Decode.succeed UnknownError
        ]


decodeCommitAnalysisPendingError : Decode.Decoder GetCommitReviewError
decodeCommitAnalysisPendingError =
    Decode.field "errorCode" Decode.int
        |> Decode.andThen
            (\errorCode ->
                if errorCode == 18 then
                    Decode.succeed CommitAnalysisPending

                else
                    Decode.fail "Wrong error code"
            )
