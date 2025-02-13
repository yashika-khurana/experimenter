/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useMemo } from "react";
import Alert from "react-bootstrap/Alert";
import { LIFECYCLE_REVIEW_FLOWS } from "src/lib/constants";
import { humanDate } from "src/lib/dateUtils";
import { getExperiment_experimentBySlug } from "src/types/getExperiment";
import {
  ExperimentsNimbusChangeLogOldStatusChoices,
  ExperimentsNimbusChangeLogOldStatusNextChoices,
} from "src/types/globalTypes";

export const RejectionReason = ({
  rejectionEvent,
}: {
  rejectionEvent: getExperiment_experimentBySlug["rejection"];
}) => {
  const { message, changedOn, changedBy, oldStatus, oldStatusNext } =
    rejectionEvent!;

  const rejectionActionDescription = useMemo(() => {
    if (oldStatus === ExperimentsNimbusChangeLogOldStatusChoices.LIVE) {
      if (
        oldStatusNext === ExperimentsNimbusChangeLogOldStatusNextChoices.LIVE
      ) {
        return LIFECYCLE_REVIEW_FLOWS.PAUSE.description;
      }
      return LIFECYCLE_REVIEW_FLOWS.END.description;
    }
    if (oldStatus === ExperimentsNimbusChangeLogOldStatusChoices.DRAFT) {
      return LIFECYCLE_REVIEW_FLOWS.LAUNCH.description;
    }
  }, [oldStatus, oldStatusNext]);

  return (
    <Alert variant="warning" data-testid="rejection-notice">
      <div className="text-body">
        <p className="mb-2">
          The request to {rejectionActionDescription} was{" "}
          <strong>Rejected</strong> due to:
        </p>
        <p className="mb-2">
          {changedBy!.email} on {humanDate(changedOn!)}:
        </p>
        <p className="bg-white rounded border p-2 mb-0">{message}</p>
      </div>
    </Alert>
  );
};

export default RejectionReason;
