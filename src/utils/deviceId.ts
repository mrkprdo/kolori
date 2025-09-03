// Device ID utility functions
// Convert IP addresses to consistent numeric IDs

/**
 * Converts an IP address to a consistent numeric ID
 * This ensures the same IP always gets the same ID
 * @param ip - IP address (e.g., "192.168.1.100")
 * @returns Numeric ID based on IP
 */
export function ipToDeviceId(ip: string): number {
  // Remove any protocol prefixes and clean the IP
  const cleanIp = ip.replace(/^https?:\/\//, '').replace(/:\d+$/, '').trim();
  
  // Split IP into octets
  const octets = cleanIp.split('.').map(octet => parseInt(octet, 10));
  
  // Validate IP format
  if (octets.length !== 4 || octets.some(octet => isNaN(octet) || octet < 0 || octet > 255)) {
    // Fallback for invalid IPs: use hash-based approach
    return stringToNumericId(cleanIp);
  }
  
  // Convert IP to numeric ID: each octet contributes to the final number
  // This creates a unique ID for each valid IP address
  const id = (octets[0] * 256 * 256 * 256) + (octets[1] * 256 * 256) + (octets[2] * 256) + octets[3];
  
  return id;
}

/**
 * Fallback function to convert any string to a consistent numeric ID
 * Used for non-standard IP formats or hostnames
 * @param str - String to convert
 * @returns Numeric ID based on string hash
 */
function stringToNumericId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Ensure positive number
  return Math.abs(hash);
}

/**
 * Converts a numeric device ID back to IP address
 * @param id - Numeric device ID
 * @returns IP address string
 */
export function deviceIdToIp(id: number): string | null {
  // Only works for IDs that were created from valid IP addresses
  if (id < 0 || id > 4294967295) { // Max IPv4 value
    return null;
  }
  
  const octet1 = Math.floor(id / (256 * 256 * 256));
  const octet2 = Math.floor((id % (256 * 256 * 256)) / (256 * 256));
  const octet3 = Math.floor((id % (256 * 256)) / 256);
  const octet4 = id % 256;
  
  // Validate octets are in valid range
  if (octet1 > 255 || octet2 > 255 || octet3 > 255 || octet4 > 255) {
    return null;
  }
  
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}