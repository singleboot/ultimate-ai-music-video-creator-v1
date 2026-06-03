import re

def parse_multi_subjects(subject_text: str) -> dict[str, str]:
    """Parse character descriptions associated with bracketed headers.
    
    Example:
    [Male] a man in a black jacket
    [Female] a woman in a red dress
    
    Returns:
        dict: {'male': 'a man in a black jacket', 'female': 'a woman in a red dress'}
    """
    subjects = {}
    current_key = None
    current_lines = []
    
    # Standardize line endings and split
    lines = subject_text.replace('\r\n', '\n').split('\n')
    
    # If the text has no brackets at all, store it under 'default'
    if not re.search(r'\[[a-zA-Z0-9_\-\s]+\]', subject_text):
        cleaned = subject_text.strip()
        if cleaned:
            subjects['default'] = cleaned
        return subjects
        
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Match a bracketed header, e.g. [Male] or [Female] or [Duet]
        match = re.match(r'^\[([a-zA-Z0-9_\-\s]+)\]$', stripped)
        if match:
            # Save previous subject if any
            if current_key and current_lines:
                subjects[current_key] = " ".join(current_lines).strip()
            current_key = match.group(1).strip().lower()
            current_lines = []
        else:
            if current_key:
                current_lines.append(stripped)
            else:
                # Text before any header is treated as 'default'
                subjects.setdefault('default', '')
                subjects['default'] = (subjects['default'] + " " + stripped).strip()
                
    if current_key and current_lines:
        subjects[current_key] = " ".join(current_lines).strip()
        
    return subjects

def get_subject_for_segment(lyrics_segment: str, subjects_map: dict, default_subject: str) -> str:
    """Identify the singer tag in the lyric segment and return the matched subject description.
    
    Checks for tags like [Male], [M], [Female], [F], [Duet], [Chorus] at the beginning or within.
    """
    seg_lower = lyrics_segment.lower()
    
    # Check male tags
    if any(tag in seg_lower for tag in ["[male]", "[m]", "male vocals", "singing by a man"]):
        return subjects_map.get("male", default_subject)
    # Check female tags
    if any(tag in seg_lower for tag in ["[female]", "[f]", "female vocals", "singing by a woman"]):
        return subjects_map.get("female", default_subject)
    # Check duet tags
    if any(tag in seg_lower for tag in ["[duet]", "[both]", "duet vocals"]):
        # Fallback to combined male and female descriptions if duet is not explicitly defined
        male_desc = subjects_map.get("male", "")
        female_desc = subjects_map.get("female", "")
        combined = f"{male_desc} and {female_desc}" if male_desc and female_desc else (male_desc or female_desc)
        return subjects_map.get("duet", combined) or default_subject
    # Check chorus tags
    if any(tag in seg_lower for tag in ["[chorus]", "[group]", "chorus vocals", "group singing"]):
        return subjects_map.get("chorus", default_subject)
        
    return default_subject
