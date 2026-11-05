import {
  deleteNetWorthTarget,
  getNetWorthTargets,
  putNetWorthTarget,
} from "@/app/lib/net-worth/net-worth-target";

export const GET = getNetWorthTargets;
export const PUT = putNetWorthTarget;
export const DELETE = deleteNetWorthTarget;
