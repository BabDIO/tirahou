import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Phone, Mail, UserPlus, Bell, CheckCircle } from 'lucide-react';
import api from '@/api/client';
import toast from 'react-hot-toast';

interface ParentGuardian {
  id: string;
  uuid: string;
  student: string;
  student_name: string;
  student_id: string;
  relationship: string;
  relationship_display: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  phone_secondary?: string;
  address?: string;
  city?: string;
  country: string;
  profession?: string;
  employer?: string;
  can_receive_notifications: boolean;
  notification_preferences: Record<string, boolean>;
  notification_types: string[];
  is_primary_contact: boolean;
  is_emergency_contact: boolean;
  has_legal_authority: boolean;
  created_at: string;
}

export default function ParentsManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<ParentGuardian | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch parents
  const { data: parents, isLoading } = useQuery({
    queryKey: ['parent-guardians', searchTerm],
    queryFn: async () => {
      const response = await api.get('/people/parent-guardians/', {
        params: { search: searchTerm || undefined }
      });
      return response.data.results || response.data;
    }
  });

  // Delete parent
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/people/parent-guardians/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-guardians'] });
      toast.success('Parent/Tuteur supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  // Set primary contact
  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/people/parent-guardians/${id}/set_primary/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-guardians'] });
      toast.success('Contact prioritaire défini');
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Supprimer ${name} ?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredParents = parents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Gestion des Parents/Tuteurs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredParents.length} parent{filteredParents.length > 1 ? 's' : ''} enregistré{filteredParents.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ajouter un parent
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, téléphone, étudiant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Parents List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement...</p>
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <UserPlus className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Aucun parent/tuteur trouvé</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Ajouter le premier parent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredParents.map((parent: ParentGuardian) => (
            <div
              key={parent.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {parent.full_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {parent.relationship_display}
                  </p>
                </div>
                {parent.is_primary_contact && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    Prioritaire
                  </span>
                )}
              </div>

              {/* Étudiant */}
              <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Étudiant :</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{parent.student_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{parent.student_id}</p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {parent.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-gray-100">{parent.phone}</span>
                  </div>
                )}
                {parent.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-gray-100 truncate">{parent.email}</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {parent.is_emergency_contact && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded">
                    Urgence
                  </span>
                )}
                {parent.has_legal_authority && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                    Autorité légale
                  </span>
                )}
                {parent.can_receive_notifications && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Notifications
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!parent.is_primary_contact && (
                  <button
                    onClick={() => setPrimaryMutation.mutate(parent.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm 
                             bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                             rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    disabled={setPrimaryMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Prioritaire
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedParent(parent);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(parent.id, parent.full_name)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TODO: Add Parent Form Modal */}
      {/* <ParentFormModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedParent(null);
        }}
        parent={selectedParent}
      /> */}
    </div>
  );
}
