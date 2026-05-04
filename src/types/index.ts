import { Timestamp } from "firebase/firestore";

export type UserRole =
  | "student"
  | "adviser"
  | "panel"
  | "adviser_panel"
  | "admin";

export type ThesisStage = "proposal" | "pre_oral" | "final_oral" | "manuscript";

export type StageStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "scheduled"
  | "evaluated"
  | "approved"
  | "revision_required"
  | "rejected"
  | "completed";

export type AdviserApplicationType = "volunteer" | "assigned";
export type AdviserApplicationStatus = "pending" | "approved" | "rejected";

export type NotificationType =
  | "submission"
  | "approval"
  | "assignment"
  | "evaluation"
  | "schedule"
  | "comment";

export interface TmsUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string;
  institutionalEmail: string;
  createdAt: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  members: string[]; // student UIDs
  leaderId: string;
  adviserId: string | null;
  status: "forming" | "active" | "completed";
  createdAt: Timestamp;
}

export interface Thesis {
  id: string;
  groupId: string;
  title: string;
  abstract: string;
  currentStage: ThesisStage;
  stageStatus: StageStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Submission {
  id: string;
  thesisId: string;
  stage: ThesisStage;
  fileUrl: string; // Supabase signed URL or path
  fileName: string;
  version: number;
  submittedBy: string; // student UID
  submittedAt: Timestamp;
  status: "pending" | "reviewed" | "approved" | "revision_required";
  adviserFeedback: string | null;
}

export interface AdviserApplication {
  id: string;
  thesisId: string;
  adviserId: string;
  type: AdviserApplicationType;
  status: AdviserApplicationStatus;
  appliedAt: Timestamp;
}

export interface PanelAssignment {
  id: string;
  thesisId: string;
  panelMemberId: string;
  panelMemberName?: string;
  stage: ThesisStage;
  assignedAt: Timestamp;
  assignedBy: string; // admin UID
}

export interface EvaluationGrades {
  [criterion: string]: number;
}

export interface Evaluation {
  id: string;
  thesisId: string;
  panelMemberId: string;
  panelMemberName?: string;
  stage: ThesisStage;
  grades: EvaluationGrades;
  overallScore: number;
  comments: string;
  submittedAt: Timestamp;
}

export interface Comment {
  id: string;
  thesisId: string;
  submissionId: string;
  authorId: string;
  text: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  relatedId: string; // thesisId or submissionId
  createdAt: Timestamp;
}

export interface DefenseSchedule {
  id: string;
  thesisId: string;
  stage: "proposal" | "pre_oral" | "final_oral";
  scheduledAt: Timestamp;
  venue: string;
  panelIds: string[];
  createdAt: Timestamp;
}

export interface ProposalDocument {
  id: string;            // = thesisId (Firestore doc ID)
  thesisId: string;
  content: object;       // TipTap JSON (ProseMirror format)
  version: number;
  lastEditedBy: string;  // UID
  lastEditedAt: Timestamp;
}

export interface InlineComment {
  id: string;            // also used as commentId inside the TipTap mark
  thesisId: string;
  authorId: string;
  authorName: string;
  text: string;
  resolved: boolean;
  createdAt: Timestamp;
}

// UI helper types
export interface ThesisWithGroup extends Thesis {
  group?: Group;
}

export interface SubmissionWithUser extends Submission {
  submitter?: TmsUser;
}

export const STAGE_LABELS: Record<ThesisStage, string> = {
  proposal: "Proposal / Title Defense",
  pre_oral: "Pre-Oral Defense",
  final_oral: "Final Oral Defense",
  manuscript: "Manuscript Submission",
};

export const STATUS_LABELS: Record<StageStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  scheduled: "Scheduled",
  evaluated: "Evaluated",
  approved: "Approved",
  revision_required: "Revision Required",
  rejected: "Rejected",
  completed: "Completed",
};

export const EVALUATION_CRITERIA: Record<ThesisStage, string[]> = {
  proposal: [
    "Research Problem Clarity",
    "Scope and Feasibility",
    "Related Literature",
    "Methodology",
    "Presentation",
  ],
  pre_oral: [
    "Conceptual Framework",
    "Research Design",
    "Data Collection",
    "Analysis",
    "Presentation",
  ],
  final_oral: [
    "Findings and Discussion",
    "Conclusions",
    "Recommendations",
    "Manuscript Quality",
    "Presentation",
  ],
  manuscript: [
    "Content Completeness",
    "Writing Quality",
    "Citations",
    "Formatting",
    "Overall Quality",
  ],
};
