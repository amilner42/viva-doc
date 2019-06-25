module Api.Responses.GetCommitReview exposing (CommitReviewResponse(..), decodeCommitReviewResponse, mapComplete)

import CommitReview
import Json.Decode as Decode


type CommitReviewResponse
    = Pending (List String)
    | Complete CommitReview.CommitReview
    | AnalysisFailed String


mapComplete : (CommitReview.CommitReview -> CommitReview.CommitReview) -> CommitReviewResponse -> CommitReviewResponse
mapComplete updater crr =
    case crr of
        Complete commitReview ->
            Complete <| updater commitReview

        _ ->
            crr


decodeCommitReviewResponse : Decode.Decoder CommitReviewResponse
decodeCommitReviewResponse =
    Decode.field "responseTag" Decode.string
        |> Decode.andThen
            (\responseTag ->
                case responseTag of
                    "pending" ->
                        Decode.map Pending <|
                            Decode.field "data" (Decode.list Decode.string)

                    "complete" ->
                        Decode.map Complete <|
                            Decode.field "data" CommitReview.decodeCommitReview

                    "analysis-failed" ->
                        Decode.map AnalysisFailed <|
                            Decode.field "data" Decode.string

                    _ ->
                        Decode.fail <| "Response tag not valid: " ++ responseTag
            )
