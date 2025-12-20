export async function scanFile(file: File): Promise<boolean> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Basic check for dangerous extensions
  const isDangerous = file.name.endsWith(".exe") || file.name.endsWith(".bat") || file.name.endsWith(".sh");
  
  if (isDangerous) {
    throw new Error("Security Alert: Executable files are not permitted.");
  }

  return true;
}