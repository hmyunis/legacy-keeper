import pytest
from django.urls import reverse
from rest_framework import status

from genealogy.models import PersonProfile, Relationship
from vaults.models import Membership

from .factories import FamilyVaultFactory, MembershipFactory, UserFactory


@pytest.mark.django_db
class TestGenealogyAndIntelligence:
    def test_admin_can_create_person_profile(self, api_client):
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=admin)
        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)

        api_client.force_authenticate(user=admin)
        url = reverse('profiles-list')
        payload = {
            'vault': str(vault.id),
            'full_name': 'Abebe Kebede',
            'birth_place': 'Addis Ababa',
            'bio': 'Family elder',
        }

        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert PersonProfile.objects.filter(vault=vault, full_name='Abebe Kebede').exists()

    def test_non_admin_cannot_create_person_profile(self, api_client):
        owner = UserFactory()
        contributor = UserFactory()
        vault = FamilyVaultFactory(owner=owner)
        MembershipFactory(user=owner, vault=vault, role=Membership.Roles.ADMIN)
        MembershipFactory(user=contributor, vault=vault, role=Membership.Roles.CONTRIBUTOR)

        api_client.force_authenticate(user=contributor)
        response = api_client.post(
            reverse('profiles-list'),
            {
                'vault': str(vault.id),
                'full_name': 'Unauthorized Edit',
            },
            format='json',
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_self_referencing_relationship_is_blocked(self, api_client):
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=admin)
        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)
        person = PersonProfile.objects.create(vault=vault, full_name='Self Loop Candidate')

        api_client.force_authenticate(user=admin)
        url = reverse('relationships-list')
        payload = {
            'from_person': str(person.id),
            'to_person': str(person.id),
            'relationship_type': Relationship.RelationshipType.PARENT_OF,
        }
        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_tree_endpoint_returns_nodes_and_edges(self, api_client):
        admin = UserFactory()
        vault = FamilyVaultFactory(owner=admin)
        MembershipFactory(user=admin, vault=vault, role=Membership.Roles.ADMIN)

        parent = PersonProfile.objects.create(vault=vault, full_name='Parent Person')
        child = PersonProfile.objects.create(vault=vault, full_name='Child Person')
        Relationship.objects.create(
            from_person=parent,
            to_person=child,
            relationship_type=Relationship.RelationshipType.PARENT_OF,
        )

        api_client.force_authenticate(user=admin)
        url = reverse('profiles-tree')
        response = api_client.get(url, {'vault': str(vault.id)})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['nodes']) == 2
        assert len(response.data['edges']) == 1
