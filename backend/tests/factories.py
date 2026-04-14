import factory
from django.contrib.auth import get_user_model
from vaults.models import FamilyVault, Membership
from media.models import MediaItem
from django.utils import timezone

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f'user{n}@example.com')
    full_name = factory.Faker('name')
    is_active = True
    is_verified = True

class FamilyVaultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = FamilyVault

    name = factory.Faker('company')
    owner = factory.SubFactory(UserFactory)
    safety_window_minutes = 60

class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Membership

    user = factory.SubFactory(UserFactory)
    vault = factory.SubFactory(FamilyVaultFactory)
    role = Membership.Roles.CONTRIBUTOR
    is_active = True

class MediaItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MediaItem

    vault = factory.SubFactory(FamilyVaultFactory)
    uploader = factory.SubFactory(UserFactory)
    title = factory.Faker('sentence')
    media_type = MediaItem.MediaType.PHOTO
    file_size = 1024 * 1024 # 1MB
    created_at = factory.LazyFunction(timezone.now)
