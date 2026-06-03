import unittest
import sys
import os
import re

# Add app directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.modules.subject_parser import parse_multi_subjects, get_subject_for_segment
from app.modules.pipeline import get_clean_lyrics_lines

class TestSubjectParser(unittest.TestCase):
    def test_parse_multi_subjects(self):
        text = """
        [Male]
        a man with dark hair, wearing a leather jacket
        [Female]
        a woman with blonde hair, wearing a red dress
        [Duet]
        a man and a woman standing side by side
        [Chorus]
        a group of band members performing on a stage
        """
        subjects = parse_multi_subjects(text)
        self.assertEqual(subjects.get("male"), "a man with dark hair, wearing a leather jacket")
        self.assertEqual(subjects.get("female"), "a woman with blonde hair, wearing a red dress")
        self.assertEqual(subjects.get("duet"), "a man and a woman standing side by side")
        self.assertEqual(subjects.get("chorus"), "a group of band members performing on a stage")

    def test_parse_multi_subjects_no_brackets(self):
        text = "a simple single subject description"
        subjects = parse_multi_subjects(text)
        self.assertEqual(subjects.get("default"), "a simple single subject description")

    def test_get_subject_for_segment(self):
        subjects_map = {
            "male": "a man in a black jacket",
            "female": "a woman in a red dress",
            "duet": "a man and a woman",
            "chorus": "a group of singers"
        }
        
        self.assertEqual(
            get_subject_for_segment("[Male] I will wait", subjects_map, "default_sub"),
            "a man in a black jacket"
        )
        self.assertEqual(
            get_subject_for_segment("[M] Hello", subjects_map, "default_sub"),
            "a man in a black jacket"
        )
        self.assertEqual(
            get_subject_for_segment("[Female] Hi", subjects_map, "default_sub"),
            "a woman in a red dress"
        )
        self.assertEqual(
            get_subject_for_segment("[Duet] Singing together", subjects_map, "default_sub"),
            "a man and a woman"
        )
        self.assertEqual(
            get_subject_for_segment("Just normal lyrics line", subjects_map, "default_sub"),
            "default_sub"
        )

    def test_get_clean_lyrics_lines(self):
        lyrics = """
        [Intro]
        Don’t look at me like that
        
        [Verse 1]
        [Male] You say it soft, almost sweet
        [Female] Like sugar hiding razor teeth
        """
        lines = get_clean_lyrics_lines(lyrics)
        self.assertEqual(len(lines), 3)
        self.assertEqual(lines[0], "Don’t look at me like that")
        self.assertEqual(lines[1], "[Male] You say it soft, almost sweet")
        self.assertEqual(lines[2], "[Female] Like sugar hiding razor teeth")

if __name__ == "__main__":
    unittest.main()
