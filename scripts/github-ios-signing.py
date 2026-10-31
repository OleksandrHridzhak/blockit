"""Restore repository-encrypted signing data into a temporary macOS keychain."""
import base64
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import subprocess
import sys

TEAM = "2WT689Y795"
BUNDLE = "com.hridzhak.blockit.2WT689Y795"
GROUP = "group.com.hridzhak.blockit.2WT689Y795"
TARGETS = {"Blockit": BUNDLE, **{name: BUNDLE + "." + name for name in ("BlockitShield", "BlockitAction", "BlockitMonitor")}}


def command(args):
    # A failed subprocess must not expose a password from its argument list.
    result = subprocess.run(args, capture_output=True)
    if result.returncode:
        raise RuntimeError(f"Signing operation failed: {Path(args[0]).name}")
    return result.stdout


def main():
    root = Path(os.environ["RUNNER_TEMP"]).resolve()
    folder = root / "blockit-signing"
    keychain = root / "blockit-signing.keychain-db"
    if sys.argv[1:] == ["cleanup"]:
        subprocess.run(["security", "delete-keychain", str(keychain)], capture_output=True)
        if folder.parent == root and folder.name == "blockit-signing":
            shutil.rmtree(folder, ignore_errors=True)
        return
    folder.mkdir(mode=0o700, exist_ok=True)
    payload = json.loads(gzip.decompress(base64.b64decode(os.environ.pop("BLOCKIT_IOS_SIGNING"))))
    for value in payload.values():
        print("::add-mask::" + value["password"], flush=True)
    password = secrets.token_urlsafe(32)
    command(["security", "create-keychain", "-p", password, str(keychain)])
    command(["security", "set-keychain-settings", "-lut", "21600", str(keychain)])
    command(["security", "unlock-keychain", "-p", password, str(keychain)])
    command(["security", "list-keychains", "-d", "user", "-s", str(keychain), str(Path.home() / "Library/Keychains/login.keychain-db")])
    profiles = {}
    imports = set()
    certificate_sha = None
    profile_folders = [Path.home() / "Library/MobileDevice/Provisioning Profiles",
                       Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"]
    for folder_path in profile_folders:
        folder_path.mkdir(parents=True, exist_ok=True)
    for target, bundle in TARGETS.items():
        value = payload[target]
        profile_file = folder / (target + ".mobileprovision")
        profile_file.write_bytes(base64.b64decode(value["profile"]))
        profile = plistlib.loads(command(["security", "cms", "-D", "-i", str(profile_file)]))
        entitlements = profile["Entitlements"]
        assert profile["TeamIdentifier"] == [TEAM], "Wrong signing team"
        assert entitlements["application-identifier"] == TEAM + "." + bundle, "Wrong profile target"
        assert entitlements.get("com.apple.developer.family-controls") is True, "Family Controls distribution entitlement missing"
        assert GROUP in entitlements.get("com.apple.security.application-groups", []), "App Group entitlement missing"
        assert not profile.get("ProvisionedDevices") and not profile.get("ProvisionsAllDevices"), "An App Store profile is required"
        assert profile["ExpirationDate"] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None), "Expired profile"
        for folder_path in profile_folders:
            shutil.copyfile(profile_file, folder_path / (profile["UUID"] + ".mobileprovision"))
        profiles[target] = {"bundle": bundle, "uuid": profile["UUID"], "name": profile["Name"]}
        cert = base64.b64decode(value["certificate"])
        digest = hashlib.sha256(cert).hexdigest()
        if digest not in imports:
            certificate_file = folder / (target + ".p12")
            certificate_file.write_bytes(cert)
            command(["security", "import", str(certificate_file), "-P", value["password"], "-A", "-t", "cert", "-f", "pkcs12", "-k", str(keychain)])
            imports.add(digest)
        sha = hashlib.sha1(profile["DeveloperCertificates"][0]).hexdigest().upper()
        if certificate_sha is not None:
            assert certificate_sha == sha, "Profiles must use the same distribution certificate"
        certificate_sha = sha
    command(["security", "set-key-partition-list", "-S", "apple-tool:,apple:", "-k", password, str(keychain)])
    (folder / "targets.json").write_text(json.dumps({"team": TEAM, "certificate": certificate_sha, "targets": profiles}))
    export = {"method": "app-store-connect", "destination": "export", "teamID": TEAM,
              "signingStyle": "manual", "signingCertificate": certificate_sha,
              "provisioningProfiles": {p["bundle"]: p["uuid"] for p in profiles.values()},
              "manageAppVersionAndBuildNumber": False, "stripSwiftSymbols": True}
    (folder / "ExportOptions.plist").write_bytes(plistlib.dumps(export))
    print("Validated and installed App Store signing for all four Blockit targets.")


if __name__ == "__main__":
    main()
