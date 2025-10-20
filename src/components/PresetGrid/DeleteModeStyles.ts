import { StyleSheet } from 'react-native';

/**
 * Delete Mode styles
 * Used for delete actions and deletion progress modal
 */
export const deleteModeStyles = StyleSheet.create({
  // Delete Action Buttons
  deleteActionContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    zIndex: 1000,
  },
  deleteActionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  deleteActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: '#1e293b',
  },

  // Deletion Progress Modal
  deletionProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1003,
  },
  deletionProgressModal: {
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  deletionProgressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  deletionProgressText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  deletionProgressItem: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
