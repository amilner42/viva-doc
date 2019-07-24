/* Module for the UserAssessment type. */

import * as R from "ramda";


export interface UserAssessment  {
  username: string;
  tagId: string;
  assessmentType: "approved" | "rejected";
}


export const getUserAssessmentsForTagId = (userAssessments: UserAssessment[], tagId: string): UserAssessment[] => {
  return R.filter((userAssessment) => {
    return userAssessment.tagId === tagId;
  }, userAssessments);
}
