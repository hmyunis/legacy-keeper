import { common } from './common';
import { dashboard } from './dashboard';
import { vault } from './vault';
import { timeline } from './timeline';
import { tree } from './tree';
import { members } from './members';
import { modals } from './modals';
import { auditLogs } from './auditLogs';
import { settings } from './settings';
import { helpCenter } from './helpCenter';

export const en = {
  common,
  dashboard,
  vault,
  timeline,
  tree,
  members,
  modals,
  auditLogs,
  settings,
  helpCenter
};

export type TranslationSchema = typeof en;