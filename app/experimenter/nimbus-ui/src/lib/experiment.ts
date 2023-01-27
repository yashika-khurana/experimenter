/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useConfig } from "../hooks";
import { RedirectCheck } from "../lib/contexts";
import { getAllExperiments_experiments } from "../types/getAllExperiments";
import { getExperiment_experimentBySlug } from "../types/getExperiment";
import {
  NimbusExperimentPublishStatusEnum,
  NimbusExperimentStatusEnum,
} from "../types/globalTypes";
import { LIFECYCLE_REVIEW_FLOWS } from "./constants";

export function getStatus(
  experiment?: getExperiment_experimentBySlug | getAllExperiments_experiments,
) {
  const {
    status,
    statusNext,
    publishStatus,
    isEnrollmentPausePending,
    isArchived,
  } = experiment || {};

  // The experiment is or was out in the wild (live or complete)
  const launched = [
    NimbusExperimentStatusEnum.LIVE,
    NimbusExperimentStatusEnum.COMPLETE,
  ].includes(status!);

  return {
    archived: isArchived,
    draft: status === NimbusExperimentStatusEnum.DRAFT,
    preview: status === NimbusExperimentStatusEnum.PREVIEW,
    live: status === NimbusExperimentStatusEnum.LIVE,
    complete: status === NimbusExperimentStatusEnum.COMPLETE,
    idle: publishStatus === NimbusExperimentPublishStatusEnum.IDLE,
    approved: publishStatus === NimbusExperimentPublishStatusEnum.APPROVED,
    review: publishStatus === NimbusExperimentPublishStatusEnum.REVIEW,
    waiting: publishStatus === NimbusExperimentPublishStatusEnum.WAITING,
    // TODO: EXP-1325 Need to check something else here for end enrollment in particular?
    pauseRequested:
      status === NimbusExperimentStatusEnum.LIVE &&
      statusNext === NimbusExperimentStatusEnum.LIVE &&
      isEnrollmentPausePending === true,
    endRequested:
      status === NimbusExperimentStatusEnum.LIVE &&
      statusNext === NimbusExperimentStatusEnum.COMPLETE,
    launched,
  };
}

export type StatusCheck = ReturnType<typeof getStatus>;

// Common redirects used on all Edit page components
//export function editCommonRedirects({ status }: RedirectCheck) {
export function editCommonRedirects(check: RedirectCheck) {
  const { status } = check;
  // If experiment is launched or the user can't edit the experiment,
  // send them to the summary page
  if (status.launched || !status.idle || status.preview || status.archived) {
    return "";
  }
}

export function getSummaryAction(
  status: StatusCheck,
  canReview: boolean | null,
) {
  // has pending review approval
  if (status.review || status.approved || status.waiting) {
    const stringName = !canReview ? "requestSummary" : "reviewSummary";
    if (status.pauseRequested) {
      return LIFECYCLE_REVIEW_FLOWS.PAUSE[stringName];
    }
    if (status.endRequested) {
      return LIFECYCLE_REVIEW_FLOWS.END[stringName];
    } else {
      return LIFECYCLE_REVIEW_FLOWS.LAUNCH[stringName];
    }
  }

  if (!status.launched && !status.archived) {
    return "Request Launch";
  }
  return "";
}

export type ExperimentSortSelector =
  | keyof getAllExperiments_experiments
  | ((experiment: getAllExperiments_experiments) => string | undefined);

export const featureConfigNameSortSelector: ExperimentSortSelector = (
  experiment,
) => experiment.featureConfig?.name;

export const ownerUsernameSortSelector: ExperimentSortSelector = (experiment) =>
  experiment.owner?.username;

export const applicationSortSelector: ExperimentSortSelector = (experiment) =>
  experiment.application!;

export const channelSortSelector: ExperimentSortSelector = (experiment) =>
  experiment.channel!;

export const populationPercentSortSelector: ExperimentSortSelector = (
  experiment,
) => experiment.populationPercent!;

export const firefoxMinVersionSortSelector: ExperimentSortSelector = (
  experiment,
) => experiment.firefoxMinVersion!;

export const firefoxMaxVersionSortSelector: ExperimentSortSelector = (
  experiment,
) => {
  return experiment.firefoxMaxVersion!;
};

// export function dotVersion(firefoxVersion: any) {
//   return (
//     firefoxVersion?.find(
//       (obj: { value: any }) => obj?.value === firefoxVersion!,
//     )?.dotVersion || ""
//   );
// }

export const startDateSortSelector: ExperimentSortSelector = (experiment) =>
  experiment.startDate!;

export const computedEndDateSortSelector: ExperimentSortSelector = (
  experiment,
) => experiment.computedEndDate!;

export const enrollmentSortSelector: ExperimentSortSelector = ({
  startDate,
  proposedEnrollment,
}) => {
  if (startDate) {
    const startTime = new Date(startDate).getTime();
    const enrollmentMS = proposedEnrollment * (1000 * 60 * 60 * 24);
    return new Date(startTime + enrollmentMS).toISOString();
  } else {
    return "" + proposedEnrollment;
  }
};

export const resultsReadySortSelector: ExperimentSortSelector = (experiment) =>
  experiment.resultsReady ? "1" : "0";

export const selectFromExperiment = (
  experiment: getAllExperiments_experiments,
  selectBy: ExperimentSortSelector,
) =>
  "" +
  (typeof selectBy === "function"
    ? selectBy(experiment)
    : experiment[selectBy]);

export const experimentSortComparator =
  (sortBy: ExperimentSortSelector, descending: boolean) =>
  (
    experimentA: getAllExperiments_experiments,
    experimentB: getAllExperiments_experiments,
  ) => {
    const { firefoxVersions } = useConfig();
    const orderBy = descending ? -1 : 1;
    let propertyA = selectFromExperiment(experimentA, sortBy);
    let propertyB = selectFromExperiment(experimentB, sortBy);
    if (
      sortBy === firefoxMaxVersionSortSelector ||
      sortBy === firefoxMinVersionSortSelector
    ) {
      propertyA = firefoxVersions?.find((obj) => obj?.value === propertyA)
        ?.dotVersion!;
      propertyB = firefoxVersions?.find((obj) => obj?.value === propertyB)
        ?.dotVersion!;
      const aValue = parseInt(propertyA?.split(".")[0], 10);
      const bValue = parseInt(propertyB?.split(".")[0], 10);
      if (aValue !== bValue) {
        return orderBy * (aValue - bValue);
      }
      return orderBy * (bValue - aValue);
    } else {
      return orderBy * propertyA.localeCompare(propertyB);
    }
  };
