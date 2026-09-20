import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../services/api';
import { exportToCSV } from '../utils/exportCsv';

interface PartnerRecord {
  id: string;
  name: string;
  title: string;
  companyName: string;
  companyType?: string | null;
  industry?: string | null;
  bio: string;
  photoUrl?: string | null;
  companyLogoUrl?: string | null;
  websiteUrl?: string | null;
  linkedInUrl?: string | null;
  cohort?: string | null;
  courseSlug: string;
  partnerSince: string;
  isActive: boolean;
  isFeatured: boolean;
  metrics?: string | null;
  testimonial?: string | null;
}

interface PartnersTabProps {
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const PartnersTab: React.FC<PartnersTabProps> = ({ addToast }) => {
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [industry, setIndustry] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [cohort, setCohort] = useState('');
  const [courseSlug, setCourseSlug] = useState('bmb');
  const [isFeatured, setIsFeatured] = useState(false);
  const [metrics, setMetrics] = useState('');
  const [testimonial, setTestimonial] = useState('');

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await api.getPartners({
        courseSlug: filterCourse !== 'all' ? filterCourse : undefined,
        search: search.trim() || undefined,
      });
      if (res?.data) {
        setPartners(res.data);
      }
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [filterCourse, search]);

  const handleOpenCreate = () => {
    setEditingPartner(null);
    setName('');
    setTitle('');
    setCompanyName('');
    setCompanyType('');
    setIndustry('');
    setBio('');
    setPhotoUrl('');
    setWebsiteUrl('');
    setLinkedInUrl('');
    setCohort('');
    setCourseSlug('bmb');
    setIsFeatured(false);
    setMetrics('{"revenue":"$1M+","team":"20 Operatives"}');
    setTestimonial('');
    setModalOpen(true);
  };

  const handleOpenEdit = (partner: PartnerRecord) => {
    setEditingPartner(partner);
    setName(partner.name);
    setTitle(partner.title);
    setCompanyName(partner.companyName);
    setCompanyType(partner.companyType || '');
    setIndustry(partner.industry || '');
    setBio(partner.bio);
    setPhotoUrl(partner.photoUrl || '');
    setWebsiteUrl(partner.websiteUrl || '');
    setLinkedInUrl(partner.linkedInUrl || '');
    setCohort(partner.cohort || '');
    setCourseSlug(partner.courseSlug);
    setIsFeatured(partner.isFeatured);
    setMetrics(partner.metrics || '');
    setTestimonial(partner.testimonial || '');
    setModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim() || !companyName.trim() || !bio.trim()) {
      addToast('Name, title, company name, and bio are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        title: title.trim(),
        companyName: companyName.trim(),
        companyType: companyType.trim() || undefined,
        industry: industry.trim() || undefined,
        bio: bio.trim(),
        photoUrl: photoUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        cohort: cohort.trim() || undefined,
        courseSlug: courseSlug.toLowerCase(),
        isFeatured,
        metrics: metrics.trim() || undefined,
        testimonial: testimonial.trim() || undefined,
      };

      if (editingPartner) {
        await api.updatePartner(editingPartner.id, payload);
        addToast('Partner dossier updated successfully', 'success');
      } else {
        await api.createPartner(payload);
        addToast('New business partner added to network', 'success');
      }

      setModalOpen(false);
      fetchPartners();
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, partnerName: string) => {
    if (!window.confirm(`Permanently remove ${partnerName} from the Collaborative Business Network?`)) return;
    try {
      await api.deletePartner(id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
      addToast('Partner removed from network', 'info');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  const handleToggleFeatured = async (partner: PartnerRecord) => {
    try {
      const updated = !partner.isFeatured;
      await api.updatePartner(partner.id, { isFeatured: updated });
      setPartners((prev) =>
        prev.map((p) => (p.id === partner.id ? { ...p, isFeatured: updated } : p))
      );
      addToast(`Partner featured status: ${updated ? 'Active' : 'Standard'}`, 'success');
    } catch (err: any) {
      addToast(`❌ ${err.message}`, 'error');
    }
  };

  return (
    <motion.div
      key="partners"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Top Banner Control */}
      <div className="flex justify-between items-center bg-[#0E131F] p-6 rounded-2xl border border-secondary/40 flex-wrap gap-4">
        <div>
          <h3 className="font-headline-md text-lg text-on-surface font-bold">Collaborative Business Network</h3>
          <p className="font-mono-data text-xs text-on-surface-variant">
            Manage certified operative enterprises, alumni business dossiers, and leadership ventures.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportToCSV('uwe_business_partners', partners, addToast)}
            className="px-3.5 py-2 rounded-xl bg-surface-variant/40 border border-outline-variant/40 text-xs font-mono-data text-on-surface font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn-elite px-4 py-2 rounded-xl text-xs font-mono-data uppercase font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>ENLIST PARTNER</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-[#0E131F]/80 p-4 rounded-xl border border-outline-variant/30">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'bmb', 'leadership', 'ignit'].map((slug) => (
            <button
              key={slug}
              onClick={() => setFilterCourse(slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-data uppercase transition-all cursor-pointer ${
                filterCourse === slug
                  ? 'bg-secondary text-black font-bold'
                  : 'bg-surface-variant/30 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {slug === 'all' ? 'All Directives' : slug.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="w-full px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/40 text-xs text-on-surface placeholder-on-surface-variant font-mono-data focus:outline-none focus:border-secondary"
          />
        </div>
      </div>

      {/* Table of Partners */}
      <div className="bg-[#0E131F] rounded-2xl border border-outline-variant/30 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono-data">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container/60 text-on-surface uppercase tracking-wider">
                <th className="p-4">Operative &amp; Enterprise</th>
                <th className="p-4">Directive &amp; Cohort</th>
                <th className="p-4">Industry / Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface-variant">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    Loading operative business network...
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    No business partners found. Click "ENLIST PARTNER" to create one.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-surface-variant/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {partner.photoUrl ? (
                          <img
                            src={partner.photoUrl}
                            alt={partner.name}
                            className="w-10 h-10 rounded-lg object-cover border border-outline-variant/40"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center font-bold text-secondary text-sm">
                            {partner.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-on-surface text-sm">{partner.name}</div>
                          <div className="text-[11px] text-secondary">{partner.title}</div>
                          <div className="text-[11px] text-on-surface-variant">{partner.companyName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-block px-2 py-0.5 rounded bg-surface-variant/50 border border-outline-variant/30 text-on-surface uppercase mb-1">
                        {partner.courseSlug}
                      </div>
                      <div className="text-[11px] text-on-surface-variant">{partner.cohort || 'General Alum'}</div>
                    </td>
                    <td className="p-4">
                      <div>{partner.industry || '—'}</div>
                      <div className="text-[11px] text-on-surface-variant">{partner.companyType || '—'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <button
                          onClick={() => handleToggleFeatured(partner)}
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold cursor-pointer transition-all ${
                            partner.isFeatured
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-surface-variant/30 text-on-surface-variant border border-outline-variant/30 hover:text-white'
                          }`}
                        >
                          {partner.isFeatured ? '★ ALLIANCE LEADER' : 'STANDARD'}
                        </button>
                        <span className="text-[10px] text-emerald-400">ACTIVE</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(partner)}
                          className="p-1.5 rounded-lg bg-surface-variant/40 hover:bg-surface-variant text-secondary border border-outline-variant/30 cursor-pointer"
                          title="Edit Partner Dossier"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id, partner.name)}
                          className="p-1.5 rounded-lg bg-error-container/20 hover:bg-error-container/40 text-error-container border border-error-container/30 cursor-pointer"
                          title="Decommission Partner"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog for Create / Edit */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E131F] border border-secondary/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                <h3 className="text-base font-headline-md font-bold text-on-surface uppercase">
                  {editingPartner ? 'Update Partner Dossier' : 'Enlist New Business Partner'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSavePartner} className="space-y-4 font-mono-data text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Operative Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Kasun Jayawardena"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Title / Designation *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Founder &amp; CEO"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Company / Enterprise Name *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Horizon Logistics Tech"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Directive / Program *</label>
                    <select
                      value={courseSlug}
                      onChange={(e) => setCourseSlug(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary uppercase"
                    >
                      <option value="bmb">Beyond Mind Boundaries (BMB)</option>
                      <option value="leadership">UWE Leadership Academy</option>
                      <option value="ignit">IGNIT Venture Incubator</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Logistics &amp; Trade"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Cohort Tag</label>
                    <input
                      type="text"
                      value={cohort}
                      onChange={(e) => setCohort(e.target.value)}
                      placeholder="e.g. BMB Cohort 10 / 2024"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-on-surface font-bold mb-1">Executive Biography / Dossier *</label>
                  <textarea
                    required
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Provide detailed background, achievements, operational trajectory..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Photo URL</label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Company Website URL</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://company.com"
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-on-surface font-bold mb-1">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface font-bold mb-1">Enterprise Metrics (JSON)</label>
                    <input
                      type="text"
                      value={metrics}
                      onChange={(e) => setMetrics(e.target.value)}
                      placeholder='{"revenue":"$2M","team":"30"}'
                      className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-on-surface font-bold mb-1">UWE Field Testimonial Quote</label>
                  <textarea
                    rows={2}
                    value={testimonial}
                    onChange={(e) => setTestimonial(e.target.value)}
                    placeholder="Short quote describing how UWE mindset/coaching impacted their enterprise..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="accent-secondary w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isFeatured" className="text-on-surface font-bold cursor-pointer">
                    Feature as Alliance Leader on Network Showcase
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-elite px-5 py-2 rounded-xl font-bold uppercase cursor-pointer"
                  >
                    {saving ? 'Saving...' : editingPartner ? 'Update Dossier' : 'Create Partner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
