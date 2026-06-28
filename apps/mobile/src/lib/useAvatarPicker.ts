import { useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { ApiClient } from "@/lib/api";

async function pickAndCompress(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 200, height: 200 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Shared profile-photo picker: opens a Take Photo / Choose from Library
 * action sheet, handles permissions, compresses the image, and saves it
 * via ApiClient.updateProfile. Used by both the Profile screen and the
 * onboarding profile step.
 */
export function useAvatarPicker() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const saveAvatar = async (uri: string) => {
    setUploading(true);
    try {
      const avatarUrl = await pickAndCompress(uri);
      await ApiClient.updateProfile({ avatarUrl });
      await qc.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      Alert.alert("Error", "Could not save your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const pickPhoto = () => {
    Alert.alert("Profile Photo", "Choose how to set your photo.", [
      {
        text: "Take Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Camera access is required to take a photo.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await saveAvatar(result.assets[0].uri);
          }
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission needed", "Photo library access is required.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await saveAvatar(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return { uploading, pickPhoto };
}
