import base64
import re
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric import ec
from django.core.management.base import BaseCommand, CommandError


def _b64url_no_padding(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _generate_vapid_key_pair() -> tuple[str, str]:
    private_key = ec.generate_private_key(ec.SECP256R1())

    private_value = private_key.private_numbers().private_value.to_bytes(32, "big")
    public_numbers = private_key.public_key().public_numbers()
    public_bytes = b"\x04" + public_numbers.x.to_bytes(32, "big") + public_numbers.y.to_bytes(32, "big")

    return _b64url_no_padding(public_bytes), _b64url_no_padding(private_value)


def _upsert_env_values(env_path: Path, values: dict[str, str]) -> None:
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    remaining = set(values.keys())
    next_lines: list[str] = []

    for line in lines:
        updated = False
        for key, value in values.items():
            if re.match(rf"^\s*{re.escape(key)}=", line):
                next_lines.append(f"{key}={value}")
                remaining.discard(key)
                updated = True
                break
        if not updated:
            next_lines.append(line)

    if remaining:
        if next_lines and next_lines[-1].strip():
            next_lines.append("")
        for key in values:
            if key in remaining:
                next_lines.append(f"{key}={values[key]}")

    env_path.write_text("\n".join(next_lines).rstrip() + "\n", encoding="utf-8")


class Command(BaseCommand):
    help = "Generate a VAPID key pair for web push notifications."

    def add_arguments(self, parser):
        parser.add_argument(
            "--subject",
            default="mailto:admin@legacykeeper.local",
            help='VAPID subject claim (must start with "mailto:" or "https://").',
        )
        parser.add_argument(
            "--write-env",
            metavar="PATH",
            help="Optional .env file path to update with generated keys and subject.",
        )

    def handle(self, *args, **options):
        subject = str(options["subject"]).strip()
        if not subject.startswith("mailto:") and not subject.startswith("https://"):
            raise CommandError('Invalid --subject. Use a "mailto:" or "https://" value.')

        public_key, private_key = _generate_vapid_key_pair()
        env_values = {
            "VAPID_PUBLIC_KEY": public_key,
            "VAPID_PRIVATE_KEY": private_key,
            "VAPID_SUBJECT": subject,
        }

        self.stdout.write(self.style.SUCCESS("Generated VAPID keys:\n"))
        for key, value in env_values.items():
            self.stdout.write(f"{key}={value}")

        env_target = options.get("write_env")
        if env_target:
            env_path = Path(env_target).expanduser().resolve()
            _upsert_env_values(env_path, env_values)
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS(f"Updated env file: {env_path}"))

