import { RespondToMissingDocumentScreen } from './RespondToMissingDocumentScreen';

// Customer document uploads go through the requirement-based screen: the
// customer picks a file for each requested document and never types a
// document code (the previous free-text form also sent an invalid
// "customer_upload" type; audit M-04/M-26).
export function UploadOrderDocumentsScreen(props: { route: any; navigation: any }) {
  return <RespondToMissingDocumentScreen {...props} />;
}
