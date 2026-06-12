"""Manager for writing input text files that ComfyUI workflow nodes read."""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class InputManager:
    """Writes text/JSON input files to ComfyUI's input directory so that
    VRGDG_LoadTextAdvanced and similar nodes can read them."""

    def __init__(self, input_dir: str):
        """Initialize with the base ComfyUI input directory.

        Args:
            input_dir: Absolute path to ComfyUI's input/ directory.
        """
        self.base = input_dir
        os.makedirs(self.base, exist_ok=True)

    def _write_file(self, subfolder: str, filename: str, text: str) -> str:
        """Write text to a file inside a subfolder of the input directory.

        Args:
            subfolder: Subfolder name (e.g. 'fulllyrics').
            filename: File name (e.g. 'full_lyrics.txt').
            text: Content to write.

        Returns:
            The absolute path to the written file.
        """
        folder = os.path.join(self.base, "VRGDG_TEMP", "TextFiles", subfolder)
        os.makedirs(folder, exist_ok=True)
        filepath = os.path.join(folder, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)

        logger.info("Wrote %s (%d chars)", filepath, len(text))
        return filepath

    def write_lyrics(self, text: str) -> str:
        """Write full lyrics to input/fulllyrics/full_lyrics.txt.

        Args:
            text: The full lyrics text.

        Returns:
            The absolute path to the written file.
        """
        return self._write_file("fulllyrics", "full_lyrics.txt", text)

    def write_theme_style(self, text: str) -> str:
        """Write theme/style description to input/themestyle/themestyle.txt.

        Args:
            text: The theme and style text.

        Returns:
            The absolute path to the written file.
        """
        return self._write_file("themestyle", "themestyle.txt", text)

    def write_story_concept(self, text: str) -> str:
        """Write story concept to input/storyconcept/storyconcept.txt.

        Args:
            text: The story concept text.

        Returns:
            The absolute path to the written file.
        """
        return self._write_file("storyconcept", "storyconcept.txt", text)

    def write_subject_scenes(self, text: str) -> str:
        """Write subject and scenes to input/subjectandscenes/subjectsandscenes.txt.

        Args:
            text: The subject and scenes text.

        Returns:
            The absolute path to the written file.
        """
        return self._write_file("subjectandscenes", "subjectsandscenes.txt", text)

    def write_concept_prompts(self, json_str: str, folder: Optional[str] = None) -> str:
        """Write concept prompts JSON to input/ConceptPrompts/ConceptPrompts.txt.

        Args:
            json_str: JSON string of concept prompts.
            folder: Optional subfolder override (default 'ConceptPrompts').

        Returns:
            The absolute path to the written file.
        """
        target = folder or "ConceptPrompts"
        return self._write_file(target, "ConceptPrompts.txt", json_str)

    def get_all_inputs(self) -> dict:
        """Read all current input text files and return as a dict.

        Returns:
            Dict with keys: lyrics, theme_style, story_concept, subject_scenes,
            concept_prompts (or None if file doesn't exist).
        """
        result = {}

        mappings = [
            ("lyrics", "fulllyrics", "full_lyrics.txt"),
            ("theme_style", "themestyle", "themestyle.txt"),
            ("story_concept", "storyconcept", "storyconcept.txt"),
            ("subject_scenes", "subjectandscenes", "subjectsandscenes.txt"),
            ("concept_prompts", "ConceptPrompts", "ConceptPrompts.txt"),
        ]

        for key, subfolder, filename in mappings:
            filepath = os.path.join(self.base, "VRGDG_TEMP", "TextFiles", subfolder, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    result[key] = f.read()
            except FileNotFoundError:
                result[key] = None

        return result
