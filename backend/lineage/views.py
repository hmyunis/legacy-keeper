from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Person, KinshipEdge
from core.models import VaultMember
from .serializers import PersonSerializer, KinshipEdgeSerializer
from tasks.story_weaver import generate_chronicle_task

class LineageGraphView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        nodes = Person.objects.filter(vault_id=vault_id)
        edges = KinshipEdge.objects.filter(vault_id=vault_id)

        return Response({
            "nodes": PersonSerializer(nodes, many=True).data,
            "edges": [{"from": str(e.from_person.id), "to": str(e.to_person.id), "type": e.relationship_type} for e in edges]
        })

class GraftBranchView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)

        parent_id = request.data.get('parentId')
        name = request.data.get('name')
        role = request.data.get('role', 'Relative')

        new_person = Person.objects.create(vault_id=vault_id, name=name, role=role)

        if parent_id:
            parent = get_object_or_404(Person, id=parent_id, vault_id=vault_id)
            KinshipEdge.objects.create(vault_id=vault_id, from_person=parent, to_person=new_person, relationship_type='CHILD')

        return Response({"personId": str(new_person.id)}, status=status.HTTP_201_CREATED)

class GenerateChronicleView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, vault_id, id):
        get_object_or_404(VaultMember, vault_id=vault_id, user=request.user)
        person = get_object_or_404(Person, id=id, vault_id=vault_id)

        task = generate_chronicle_task.delay(str(person.id))
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)