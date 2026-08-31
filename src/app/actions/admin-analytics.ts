"use server";

import {
  getPlatformKPIsService,
  getSignupsSeriesService,
  getProjectsByMonthService,
  getTopBrandsService,
} from "@/server/services/analytics.service";

export async function getPlatformKPIs() {
  return getPlatformKPIsService();
}

export async function getSignupsSeries(months: number = 12) {
  return getSignupsSeriesService(months);
}

export async function getProjectsByMonth(months: number = 12) {
  return getProjectsByMonthService(months);
}

export async function getTopBrands(take: number = 10) {
  return getTopBrandsService(take);
}
