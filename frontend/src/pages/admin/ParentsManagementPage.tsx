import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Phone, Mail, UserPlus, Bell, CheckCircle, X } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import useDebounce from '@/hooks/useDebounce';

const RELATIONSHIP_CHOICES = [
  { value: 'pere', label: 'Père' },
  { value: 'mere', label: 'Mère' },
  { value: 'tuteur_legal', label: 'Tuteur légal' },
  { value: 'oncle', label: 'Oncle' },
  { value: 'tante', label: 'Tante' },
  { value: 'grand_parent', label: 'Grand-parent' },
  { value: 'autre', label: 'Autre' },
];

interface StudentOption {
  id: string;
  student_id: string;
  full_name?: string;
  user?: { first_name: string; last_name: string };
}

interface ParentFormData {
  id?: string;
  student: string;
  student_label?: string;
  relationship: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_secondary: string;
  address: string;
  city: string;
  country: string;
  profession: string;
  employer: string;
  can_receive_notifications: boolean;
  is_primary_contact: boolean;
  is_emergency_contact: boolean;
  has_legal_authority: boolean;
}

const EMPTY_FORM: ParentFormData = {
  student: '', student_label: '', relationship: 'pere',
  first_name: '', last_name: '', email: '', phone: '', phone_secondary: '',
  address: '', city: '', country: 'Côte d\'Ivoire', profession: '', employer: '',
  can_receive_notifications: true, is_primary_contact: false,
  is_emergency_contact: false, has_legal_authority: false,
};

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ParentFormData>(EMPTY_FORM);
  const [studentQuery, setStudentQuery] = useState('');
  const debouncedStudentQuery = useDebounce(studentQuery, 300);
  const queryClient = useQueryClient();

  const { data: studentOptions } = useQuery({
    queryKey: ['student-search', debouncedStudentQuery],
    queryFn: async () => {
      const response = await api.get('/students/', { params: { search: debouncedStudentQuery } });
      return (response.data.results || response.data) as StudentOption[];
    },
    enabled: debouncedStudentQuery.length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: (data: ParentFormData) => {
      const { id, student_label, ...payload } = data;
      void student_label;
      return id
        ? api.patch(`/parent-guardians/${id}/`, payload)
        : api.post('/parent-guardians/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent-guardians'] });
      toast.success(formData.id ? 'Parent/Tuteur modifié avec succès' : 'Parent/Tuteur ajouté avec succès');
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement. Vérifiez les champs requis.');
    },
  });

  const openAddModal = () => {
    setFormData(EMPTY_FORM);
    setStudentQuery('');
    setIsModalOpen(true);
  };

  const openEditModal = (parent: ParentGuardian) => {
    setFormData({
      id: parent.id, student: parent.student, student_label: `${parent.full_name} — ${parent.student_id}`,
      relationship: parent.relationship, first_name: parent.first_name, last_name: parent.last_name,
      email: parent.email, phone: parent.phone, phone_secondary: parent.phone_secondary || '',
      address: parent.address || '', city: parent.city || '', country: parent.country || 'Côte d\'Ivoire',
      profession: parent.profession || '', employer: parent.employer || '',
      can_receive_notifications: parent.can_receive_notifications, is_primary_contact: parent.is_primary_contact,
      is_emergency_contact: parent.is_emergency_contact, has_legal_authority: parent.has_legal_authority,
    });
    setStudentQuery('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student || !formData.last_name || !formData.first_name) {
      toast.error('Étudiant, nom et prénom sont requis.');
      return;
    }
    saveMutation.mutate(formData);
  };

  // Fetch parents
  const { data: parents, isLoading } = useQuery({
    queryKey: ['parent-guardians', searchTerm],
    queryFn: async () => {
      const response = await api.get('/parent-guardians/', {
        params: { search: searchTerm || undefined }
      });
      return response.data.results || response.data;
    }
  });

  // Delete parent
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/parent-guardians/${id}/`),
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
    mutationFn: (id: string) => api.post(`/parent-guardians/${id}/set_primary/`),
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
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ajouter un parent
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
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
            onClick={openAddModal}
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
                    <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-gray-100">{parent.phone}</span>
                  </div>
                )}
                {parent.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
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
                  onClick={() => openEditModal(parent)}
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

      {/* Add/Edit Parent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formData.id ? 'Modifier le parent/tuteur' : 'Ajouter un parent/tuteur'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Student picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Étudiant <span className="text-red-500">*</span>
                </label>
                {formData.student && formData.student_label ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    <span className="text-gray-900 dark:text-gray-100">{formData.student_label}</span>
                    {!formData.id && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, student: '', student_label: '' })}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Changer
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher un étudiant (nom, matricule)..."
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {studentOptions && studentOptions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {studentOptions.map((s) => {
                          const label = s.full_name || (s.user ? `${s.user.first_name} ${s.user.last_name}` : s.student_id)
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => {
                                setFormData({ ...formData, student: s.id, student_label: `${label} — ${s.student_id}` })
                                setStudentQuery('')
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                            >
                              {label} <span className="text-gray-400 dark:text-gray-500 text-xs">— {s.student_id}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lien de parenté</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                >
                  {RELATIONSHIP_CHOICES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profession</label>
                  <input type="text" value={formData.profession} onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ville</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={formData.can_receive_notifications}
                    onChange={(e) => setFormData({ ...formData, can_receive_notifications: e.target.checked })} />
                  Peut recevoir des notifications
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={formData.is_primary_contact}
                    onChange={(e) => setFormData({ ...formData, is_primary_contact: e.target.checked })} />
                  Contact prioritaire
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={formData.is_emergency_contact}
                    onChange={(e) => setFormData({ ...formData, is_emergency_contact: e.target.checked })} />
                  Contact d'urgence
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={formData.has_legal_authority}
                    onChange={(e) => setFormData({ ...formData, has_legal_authority: e.target.checked })} />
                  Autorité légale sur l'étudiant
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Enregistrement...' : formData.id ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
