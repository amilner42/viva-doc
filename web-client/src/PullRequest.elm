module PullRequest exposing (PullRequest, decodePullRequest, decodePullRequests)

import Json.Decode as Decode


type alias PullRequest =
    { number : Int
    , title : String
    , headCommitId : String
    }


decodePullRequests : Decode.Decoder (List PullRequest)
decodePullRequests =
    Decode.list decodePullRequest


decodePullRequest : Decode.Decoder PullRequest
decodePullRequest =
    Decode.map3 PullRequest
        (Decode.field "number" Decode.int)
        (Decode.field "title" Decode.string)
        (Decode.field "headCommitId" Decode.string)
