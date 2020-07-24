import datetime
import json
import os
from jsonschema import validate

from django.test import TestCase

from mozilla_nimbus_shared import get_data

from experimenter.experiments.models import Experiment, ExperimentBucketNamespace
from experimenter.experiments.tests.factories import (
    ExperimentFactory,
    ExperimentVariantFactory,
)
from experimenter.experiments.api.v4.serializers import ExperimentRapidRecipeSerializer

NIMBUS_DATA = get_data()


class TestExperimentRapidRecipeSerializer(TestCase):
    def test_serializer_outputs_expected_schema(self):
        audience = "us_only"
        features = ["pinned_tabs", "picture_in_picture"]
        normandy_slug = "experimenter-normandy-slug"
        today = datetime.datetime.today()
        experiment = ExperimentFactory.create(
            type=Experiment.TYPE_RAPID,
            rapid_type=Experiment.RAPID_AA_CFR,
            audience=audience,
            features=features,
            normandy_slug=normandy_slug,
            firefox_min_version="80.0",
            proposed_enrollment=9,
            proposed_start_date=today,
        )

        ExperimentVariantFactory.create(
            experiment=experiment, slug="control", is_control=True
        )
        ExperimentVariantFactory.create(experiment=experiment, slug="variant-2")

        serializer = ExperimentRapidRecipeSerializer(experiment)
        data = serializer.data

        fn = os.path.join(os.path.dirname(__file__), "experimentRecipe.json")

        with open(fn, "r") as f:
            json_schema = json.load(f)
        self.assertIsNone(validate(instance=data, schema=json_schema))

        arguments = data.pop("arguments")
        branches = arguments.pop("branches")

        self.assertDictEqual(
            data,
            {
                "id": normandy_slug,
                "filter_expression": "env.version|versionCompare('80.0') >= 0",
                "targeting": "localeLanguageCode == 'en' && region == 'US'"
                " && browserSettings.update.channel == 'release'",
                "enabled": True,
            },
        )

        self.assertDictEqual(
            dict(arguments),
            {
                "userFacingName": experiment.name,
                "userFacingDescription": experiment.public_description,
                "slug": normandy_slug,
                "active": True,
                "isEnrollmentPaused": False,
                "endDate": None,
                "proposedEnrollment": experiment.proposed_enrollment,
                "features": features,
                "referenceBranch": "control",
                "startDate": today.isoformat(),
                "bucketConfig": {
                    "count": 0,
                    "namespace": "",
                    "randomizationUnit": "normandy_id",
                    "start": 0,
                    "total": 10000,
                },
            },
        )
        converted_branches = [dict(branch) for branch in branches]
        self.assertEqual(
            converted_branches,
            [
                {"ratio": 33, "slug": "variant-2", "value": None},
                {"ratio": 33, "slug": "control", "value": None},
            ],
        )

    def test_serializer_outputs_expected_schema_with_nameSpace_bucket(self):
        audience = "us_only"
        features = ["pinned_tabs", "picture_in_picture"]
        normandy_slug = "experimenter-normandy-slug"
        today = datetime.datetime.today()
        experiment = ExperimentFactory.create(
            type=Experiment.TYPE_RAPID,
            rapid_type=Experiment.RAPID_AA_CFR,
            audience=audience,
            features=features,
            normandy_slug=normandy_slug,
            firefox_min_version="80.0",
            proposed_enrollment=9,
            proposed_start_date=today,
        )

        ExperimentVariantFactory.create(
            experiment=experiment, slug="control", is_control=True
        )
        ExperimentVariantFactory.create(experiment=experiment, slug="variant-2")

        ExperimentBucketNamespace.request_namespace_buckets(
            experiment.normandy_slug,
            experiment,
            NIMBUS_DATA["ExperimentDesignPresets"]["empty_aa"]["preset"]["arguments"][
                "bucketConfig"
            ]["count"],
        )

        serializer = ExperimentRapidRecipeSerializer(experiment)
        data = serializer.data

        fn = os.path.join(os.path.dirname(__file__), "experimentRecipe.json")
        with open(fn, "r") as f:
            json_schema = json.load(f)
        self.assertIsNone(validate(instance=data, schema=json_schema))

        arguments = data.pop("arguments")
        branches = arguments.pop("branches")

        self.assertDictEqual(
            data,
            {
                "id": normandy_slug,
                "filter_expression": "env.version|versionCompare('80.0') >= 0",
                "targeting": "localeLanguageCode == 'en' && region == 'US'"
                " && browserSettings.update.channel == 'release'",
                "enabled": True,
            },
        )

        bucket = experiment.bucket

        self.assertDictEqual(
            dict(arguments),
            {
                "userFacingName": experiment.name,
                "userFacingDescription": experiment.public_description,
                "slug": normandy_slug,
                "active": True,
                "isEnrollmentPaused": False,
                "endDate": None,
                "proposedEnrollment": experiment.proposed_enrollment,
                "features": features,
                "referenceBranch": "control",
                "startDate": today.isoformat(),
                "bucketConfig": {
                    "count": bucket.count,
                    "namespace": bucket.namespace.name,
                    "randomizationUnit": bucket.namespace.randomization_unit,
                    "start": bucket.start,
                    "total": bucket.namespace.total,
                },
            },
        )
        converted_branches = [dict(branch) for branch in branches]
        self.assertEqual(
            converted_branches,
            [
                {"ratio": 33, "slug": "variant-2", "value": None},
                {"ratio": 33, "slug": "control", "value": None},
            ],
        )
