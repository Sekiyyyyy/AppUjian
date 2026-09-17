import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, RefreshCw, AlertCircle, Filter, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showSuccessToast, showErrorToast } from '../utils/alert';

interface ExamParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number;
  examTitle: string;
}

interface Participant {
  id: number;
  name: string;
  nis: string;
  class_id: number;
  class?: {
    ID: number;
    level: string;
    department: string;
    number: string;
  };
  session_status: string; // "BELUM MULAI", "ONGOING", "SUBMITTED", "TIMEOUT"
}

const ExamParticipantsModal: React.FC<ExamParticipantsModalProps> = ({ isOpen, onClose, examId, examTitle }) => {
  const { token } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | 'ALL'>('ALL');
  
  const fetchParticipants = async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/v1/admin/exams/${examId}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParticipants(response.data || []);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      showErrorToast("Gagal mengambil data peserta ujian");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
      setSelectedClassId('ALL');
    }
  }, [isOpen, examId]);

  const handleReset = async (studentId: number, studentName: string) => {
    const isConfirmed = await confirmAction(
      "Reset Ujian Siswa",
      `Apakah Anda yakin ingin mereset ujian untuk ${studentName}? Seluruh jawaban dan riwayat pengerjaannya akan dihapus permanen!`
    );

    if (isConfirmed) {
      try {
        await axios.delete(`http://localhost:8080/api/v1/admin/exams/${examId}/reset/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showSuccessToast(`Berhasil mereset ujian untuk ${studentName}`);
        fetchParticipants(); // refresh
      } catch (error: any) {
        showErrorToast(error.response?.data?.error || "Gagal mereset ujian");
      }
    }
  };

  if (!isOpen) return null;

  // Extract unique classes for filter
  const uniqueClasses = Array.from(new Set(participants.map(p => p.class_id)))
    .map(classId => participants.find(p => p.class_id === classId)?.class)
    .filter(Boolean);

  const filteredParticipants = selectedClassId === 'ALL' 
    ? participants 
    : participants.filter(p => p.class_id === selectedClassId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Peserta Ujian</h3>
            <p className="text-sm text-gray-500 mt-1">{examTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map((cls: any) => (
                <option key={cls.ID} value={cls.ID}>
                  {cls.level} {cls.department} {cls.number}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={fetchParticipants}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak Ada Peserta</h3>
              <p className="text-gray-500 text-sm">Belum ada siswa di kelas yang dipilih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Nama Siswa</th>
                    <th className="px-6 py-4">NIS</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Status Ujian</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredParticipants.map((p) => {
                    // Status styling
                    let StatusIcon = AlertCircle;
                    let statusColor = "bg-gray-100 text-gray-700 border-gray-200";
                    let statusText = p.session_status;
                    let canReset = false;

                    if (p.session_status === "ONGOING") {
                      StatusIcon = Clock;
                      statusColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
                      statusText = "Sedang Mengerjakan";
                      canReset = true;
                    } else if (p.session_status === "SUBMITTED" || p.session_status === "TIMEOUT") {
                      StatusIcon = CheckCircle;
                      statusColor = "bg-green-50 text-green-700 border-green-200";
                      statusText = "Selesai";
                      canReset = true;
                    } else {
                      statusText = "Belum Mulai";
                    }

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{p.name || 'Tanpa Nama'}</td>
                        <td className="px-6 py-4 text-gray-600">{p.nis || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {p.class ? `${p.class.level} ${p.class.department} ${p.class.number}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canReset && (
                            <button
                              onClick={() => handleReset(p.id, p.name)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Reset Ujian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamParticipantsModal;
