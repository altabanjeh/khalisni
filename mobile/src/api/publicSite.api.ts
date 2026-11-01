import { apiClient, unwrapListData } from './client';
import type { LegalDocument, LegalKind, PublicAdvertisement, PublicHomepagePayload, PublicSiteTheme } from '../types/publicSite';

export const publicSiteApi = {
  getHomepage() {
    return apiClient.get<PublicHomepagePayload>('/public-site/homepage/').then((res) => res.data);
  },
  getTheme() {
    return apiClient.get<PublicSiteTheme>('/public-site/theme/').then((res) => res.data);
  },
  // Privacy policy or terms of use (utils/legal.ts); 404 while not published.
  getLegalDocument(kind: LegalKind) {
    return apiClient.get<LegalDocument>(`/public-site/legal/${kind}/`).then((res) => res.data);
  },
  getAdvertisements() {
    return apiClient.get<PublicAdvertisement[]>('/public-site/advertisements/').then((res) => unwrapListData(res.data));
  },
};
