alter table public.analytics_events
drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
add constraint analytics_events_event_name_check
check (
  event_name in (
    'page_view',
    'quiz_start',
    'quiz_complete',
    'lead_form_view',
    'assessment_submit',
    'result_view',
    'audio_purchase_click',
    'recommended_audio_click',
    'line_click',
    'consultation_booking',
    'payment_success'
  )
);
