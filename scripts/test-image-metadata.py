"""Release boundary checks: a different image, source or platform must fail closed."""
from copy import deepcopy
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import unittest

spec = spec_from_file_location("image_metadata", Path(__file__).with_name("image-metadata.py"))
metadata_module = module_from_spec(spec)
spec.loader.exec_module(metadata_module)
COMMIT = "a" * 40
IMAGE_ID = "sha256:" + "b" * 64


class ImageIdentityTests(unittest.TestCase):
    def setUp(self):
        self.inspect = [{"Id": IMAGE_ID, "Os": "linux", "Architecture": "amd64", "Config": {"Labels": {
            "org.opencontainers.image.revision": COMMIT,
            "org.opencontainers.image.source": "https://github.com/MichalBoczula/ECommerceStore.Pact.Web"}}}]
        self.metadata = metadata_module.image_metadata(self.inspect, COMMIT, IMAGE_ID)

    def test_archive_round_trip_identity(self):
        self.assertEqual(self.metadata, metadata_module.verify(self.metadata, deepcopy(self.inspect), COMMIT))

    def test_different_image_is_rejected(self):
        self.inspect[0]["Id"] = "sha256:" + "c" * 64
        with self.assertRaises(ValueError):
            metadata_module.verify(self.metadata, self.inspect, COMMIT)

    def test_different_workflow_commit_is_rejected(self):
        with self.assertRaises(ValueError):
            metadata_module.verify(self.metadata, self.inspect, "d" * 40)

    def test_foreign_source_is_rejected(self):
        self.inspect[0]["Config"]["Labels"]["org.opencontainers.image.source"] = "https://github.com/other/repo"
        with self.assertRaises(ValueError):
            metadata_module.verify(self.metadata, self.inspect, COMMIT)

    def test_untested_platform_is_rejected(self):
        self.inspect[0]["Architecture"] = "arm64"
        with self.assertRaises(ValueError):
            metadata_module.verify(self.metadata, self.inspect, COMMIT)

    def test_extra_metadata_is_rejected(self):
        with self.assertRaises(ValueError):
            metadata_module.verify({**self.metadata, "unchecked": True}, self.inspect, COMMIT)

    def test_receipt_uses_manifest_digest(self):
        digest = "sha256:" + "e" * 64
        receipt = metadata_module.receipt(self.metadata, "mb0101/ecommerce-store-pact-web", digest)
        self.assertEqual(receipt["imageReference"], "docker.io/mb0101/ecommerce-store-pact-web@" + digest)
        self.assertEqual(receipt["imageId"], IMAGE_ID)
        self.assertEqual(receipt["commitSha"], COMMIT)

    def test_invalid_release_identity_is_rejected(self):
        for repository, digest in [("other/../../repo", "sha256:" + "e" * 64), ("mb0101/web", "latest")]:
            with self.subTest(repository=repository, digest=digest), self.assertRaises(ValueError):
                metadata_module.receipt(self.metadata, repository, digest)


if __name__ == "__main__":
    unittest.main()
