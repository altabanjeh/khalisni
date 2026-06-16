import { apiClient, unwrapListData } from './client';
import type { PublicAdvertisement, PublicHomepagePayload, PublicSiteTheme } from '../types/publicSite';

export const publicSiteApi = {
  getHomepage() {
    return apiClient.get<PublicHomepagePayload>('/public-site/homepage/').then((res) => res.data);
  },
  getTheme() {
    return apiClient.get<PublicSiteTheme>('/public-site/theme/').then((res) => res.data);
  },
  getAdvertisements() {
    return apiClient.get<PublicAdvertisement[]>('/public-site/advertisements/').then((res) => unwrapListData(res.data));
  },
};
