
// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDK_LPretcFzkJQQmWVrtfPZXQbi2eq3uI",
  authDomain: "studio-94743612-fba0d.firebaseapp.com",
  projectId: "studio-94743612-fba0d",
  appId: "1:1024709511194:web:3712c0d9f644a66511e9a3",
  messagingSenderId: "1024709511194",
};

export function getFirebaseConfig() {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error('No Firebase configuration object provided.');
  }
  return firebaseConfig;
}
